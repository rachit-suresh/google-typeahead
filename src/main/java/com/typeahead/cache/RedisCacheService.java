package com.typeahead.cache;

import com.typeahead.config.CacheConfig;
import org.springframework.stereotype.Service;
import redis.clients.jedis.Jedis;
import redis.clients.jedis.JedisPool;
import redis.clients.jedis.JedisPoolConfig;
import redis.clients.jedis.params.ScanParams;
import redis.clients.jedis.resps.ScanResult;

import jakarta.annotation.PreDestroy;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class RedisCacheService {

    private final ConsistentHashRing hashRing;
    private final CacheConfig cacheConfig;
    private final Map<String, JedisPool> pools = new ConcurrentHashMap<>();
    
    // Stats counters
    private final AtomicLong cacheHits = new AtomicLong(0);
    private final AtomicLong cacheMisses = new AtomicLong(0);
    private final AtomicLong databaseQueries = new AtomicLong(0);

    public RedisCacheService(ConsistentHashRing hashRing, CacheConfig cacheConfig) {
        this.hashRing = hashRing;
        this.cacheConfig = cacheConfig;
        initializePools();
    }

    private void initializePools() {
        JedisPoolConfig poolConfig = new JedisPoolConfig();
        poolConfig.setMaxTotal(16);
        poolConfig.setMaxIdle(8);
        poolConfig.setMinIdle(2);
        poolConfig.setTestOnBorrow(true);

        for (CacheConfig.RedisNodeConfig node : cacheConfig.getNodes()) {
            JedisPool pool = new JedisPool(poolConfig, node.getHost(), node.getPort());
            pools.put(node.getName(), pool);
        }
    }

    public void incrementHits() {
        cacheHits.incrementAndGet();
    }

    public void incrementMisses() {
        cacheMisses.incrementAndGet();
    }

    public void incrementDbQueries() {
        databaseQueries.incrementAndGet();
    }

    public String get(String key) {
        String nodeName = hashRing.getNode(key);
        if (nodeName == null) return null;

        JedisPool pool = pools.get(nodeName);
        if (pool == null) return null;

        try (Jedis jedis = pool.getResource()) {
            String value = jedis.get(key);
            if (value != null) {
                incrementHits();
            } else {
                incrementMisses();
            }
            return value;
        } catch (Exception e) {
            System.err.println("Error reading from Redis Node " + nodeName + ": " + e.getMessage());
            incrementMisses(); // Treat exceptions as misses
            return null;
        }
    }

    public void put(String key, String value) {
        String nodeName = hashRing.getNode(key);
        if (nodeName == null) return;

        JedisPool pool = pools.get(nodeName);
        if (pool == null) return;

        try (Jedis jedis = pool.getResource()) {
            jedis.setex(key, cacheConfig.getTtlSeconds(), value);
        } catch (Exception e) {
            System.err.println("Error writing to Redis Node " + nodeName + ": " + e.getMessage());
        }
    }

    public void evict(String key) {
        String nodeName = hashRing.getNode(key);
        if (nodeName == null) return;

        JedisPool pool = pools.get(nodeName);
        if (pool == null) return;

        try (Jedis jedis = pool.getResource()) {
            jedis.del(key);
            System.out.println("[Cache Evict] Evicted key '" + key + "' from node " + nodeName);
        } catch (Exception e) {
            System.err.println("Error evicting from Redis Node " + nodeName + ": " + e.getMessage());
        }
    }

    public Map<String, List<String>> getActiveKeysPerNode() {
        Map<String, List<String>> activeKeys = new HashMap<>();
        for (String nodeName : pools.keySet()) {
            JedisPool pool = pools.get(nodeName);
            List<String> keys = new ArrayList<>();
            try (Jedis jedis = pool.getResource()) {
                String cursor = ScanParams.SCAN_POINTER_START;
                ScanParams scanParams = new ScanParams().count(100);
                do {
                    ScanResult<String> scanResult = jedis.scan(cursor, scanParams);
                    keys.addAll(scanResult.getResult());
                    cursor = scanResult.getCursor();
                } while (!cursor.equals(ScanParams.SCAN_POINTER_START));
            } catch (Exception e) {
                System.err.println("Failed to scan keys for node " + nodeName + ": " + e.getMessage());
            }
            activeKeys.put(nodeName, keys);
        }
        return activeKeys;
    }

    public Map<String, Object> getCacheStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("hits", cacheHits.get());
        stats.put("misses", cacheMisses.get());
        stats.put("dbQueries", databaseQueries.get());
        
        List<Map<String, Object>> nodeDetails = new ArrayList<>();
        for (CacheConfig.RedisNodeConfig node : cacheConfig.getNodes()) {
            Map<String, Object> nodeMap = new HashMap<>();
            nodeMap.put("name", node.getName());
            nodeMap.put("port", node.getPort());
            
            boolean isOnline = false;
            JedisPool pool = pools.get(node.getName());
            if (pool != null) {
                try (Jedis jedis = pool.getResource()) {
                    isOnline = "PONG".equals(jedis.ping());
                } catch (Exception e) {
                    // Offline
                }
            }
            nodeMap.put("online", isOnline);
            nodeDetails.add(nodeMap);
        }
        
        stats.put("nodes", nodeDetails);
        stats.put("keys", getActiveKeysPerNode());
        return stats;
    }

    @PreDestroy
    public void closePools() {
        for (JedisPool pool : pools.values()) {
            try {
                pool.close();
            } catch (Exception e) {
                // Ignore
            }
        }
    }
}
