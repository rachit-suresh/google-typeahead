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

    public void putAllPipelined(Map<String, String> keyValues) {
        // Group keyValues by node name
        Map<String, Map<String, String>> nodeKeyValues = new HashMap<>();
        for (Map.Entry<String, String> entry : keyValues.entrySet()) {
            String key = entry.getKey();
            String nodeName = hashRing.getNode(key);
            if (nodeName != null) {
                nodeKeyValues.computeIfAbsent(nodeName, k -> new HashMap<>()).put(key, entry.getValue());
            }
        }

        // Execute pipelined writes for each node
        for (Map.Entry<String, Map<String, String>> nodeEntry : nodeKeyValues.entrySet()) {
            String nodeName = nodeEntry.getKey();
            JedisPool pool = pools.get(nodeName);
            if (pool == null) continue;

            Map<String, String> items = nodeEntry.getValue();
            try (Jedis jedis = pool.getResource()) {
                redis.clients.jedis.Pipeline pipeline = jedis.pipelined();
                for (Map.Entry<String, String> item : items.entrySet()) {
                    pipeline.setex(item.getKey(), cacheConfig.getTtlSeconds(), item.getValue());
                }
                pipeline.sync();
            } catch (Exception e) {
                System.err.println("Error doing pipelined writes to Redis Node " + nodeName + ": " + e.getMessage());
            }
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
                // Perform a single scan request with a small count parameter to get a sample of keys.
                // This prevents loading hundreds of thousands of keys and freezing the system.
                ScanParams scanParams = new ScanParams().count(15);
                ScanResult<String> scanResult = jedis.scan(ScanParams.SCAN_POINTER_START, scanParams);
                List<String> result = scanResult.getResult();
                if (result != null) {
                    keys.addAll(result.subList(0, Math.min(result.size(), 15)));
                }
            } catch (Exception e) {
                System.err.println("Failed to scan sample keys for node " + nodeName + ": " + e.getMessage());
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
            long keyCount = 0;
            JedisPool pool = pools.get(node.getName());
            if (pool != null) {
                try (Jedis jedis = pool.getResource()) {
                    isOnline = "PONG".equals(jedis.ping());
                    if (isOnline) {
                        keyCount = jedis.dbSize();
                    }
                } catch (Exception e) {
                    // Offline
                }
            }
            nodeMap.put("online", isOnline);
            nodeMap.put("keyCount", keyCount);
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
