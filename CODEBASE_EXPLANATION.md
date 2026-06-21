# High-Performance Search Typeahead System: Codebase Explanation & Line-by-Line Guide

This document provides a line-by-line and section-by-section breakdown of every critical class in the Typeahead Microservice backend. 

---

## 1. Hashing & Caching Layer

### A. [`ConsistentHashRing.java`](file:///c:/Users/vangs/cursor/HLD/src/main/java/com/typeahead/cache/ConsistentHashRing.java)
This class maps cache keys (prefixes like `suggest:lit`) to physical Redis nodes using MD5-based consistent hashing with virtual nodes.

```java
package com.typeahead.cache;

import com.typeahead.config.CacheConfig;
import org.springframework.stereotype.Component;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.List;
import java.util.SortedMap;
import java.util.TreeMap;

@Component // Informs Spring Boot to manage this class as a singleton bean.
public class ConsistentHashRing {

    // A TreeMap sorted by natural key order (unsigned 32-bit hash coordinates).
    // It stores the virtual node coordinates (Long) and maps them to physical node names (String).
    private final SortedMap<Long, String> ring = new TreeMap<>();
    
    // Configures the replica factor: each physical node will be cloned 100 times on the ring.
    // This spreads nodes evenly, preventing uneven key clustering (hotspots).
    private final int numberOfReplicas = 100;

    // Dependency Injection: Spring passes the CacheConfig properties on bean instantiation.
    public ConsistentHashRing(CacheConfig cacheConfig) {
        initializeRing(cacheConfig.getNodes());
    }

    // Distributes virtual nodes on the TreeMap hash ring.
    private void initializeRing(List<CacheConfig.RedisNodeConfig> nodes) {
        for (CacheConfig.RedisNodeConfig node : nodes) {
            String nodeIdentifier = node.getName() + ":" + node.getPort();
            for (int i = 0; i < numberOfReplicas; i++) {
                // Generate a unique virtual name, e.g., "Redis-Node-1:6379-VN42"
                String virtualNodeName = nodeIdentifier + "-VN" + i;
                long hash = calculateHash(virtualNodeName);
                // Map the 32-bit hash value to the physical node's name
                ring.put(hash, node.getName());
            }
        }
    }

    // Resolves a cache key string to the appropriate physical Redis node.
    public String getNode(String key) {
        if (ring.isEmpty()) {
            return null;
        }
        long hash = calculateHash(key);
        if (!ring.containsKey(hash)) {
            // Find the portion of the TreeMap with keys greater than or equal to the key's hash.
            SortedMap<Long, String> tailMap = ring.tailMap(hash);
            // Clockwise movement: If tailMap is empty, wrap around to the first element in the ring.
            // Otherwise, get the immediate next key coordinates.
            hash = tailMap.isEmpty() ? ring.firstKey() : tailMap.firstKey();
        }
        return ring.get(hash);
    }

    // Computes MD5 and extracts the first 4 bytes as an unsigned 32-bit integer.
    public long calculateHash(String key) {
        try {
            MessageDigest md = MessageDigest.getInstance("MD5");
            md.update(key.getBytes());
            byte[] digest = md.digest();
            
            // Reconstruct a 32-bit integer from the first four bytes (little-endian representation).
            long hash = ((long) (digest[3] & 0xFF) << 24)
                    | ((long) (digest[2] & 0xFF) << 16)
                    | ((long) (digest[1] & 0xFF) << 8)
                    | ((long) (digest[0] & 0xFF));
            
            // Mask with 0xFFFFFFFFL to treat the result as an unsigned 32-bit integer.
            return hash & 0xFFFFFFFFL;
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("MD5 not available", e);
        }
    }

    public SortedMap<Long, String> getRing() {
        return ring;
    }
}
```

---

### B. [`RedisCacheService.java`](file:///c:/Users/vangs/cursor/HLD/src/main/java/com/typeahead/cache/RedisCacheService.java)
Manages separate client connection pools for each Redis instance, tracking hits, misses, and keyspaces.

```java
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

@Service // Registers this class as a Spring Boot managed service.
public class RedisCacheService {

    private final ConsistentHashRing hashRing;
    private final CacheConfig cacheConfig;
    
    // Concurrent map storing the JedisPool connection pool for each Redis node.
    private final Map<String, JedisPool> pools = new ConcurrentHashMap<>();
    
    // Thread-safe metrics counters.
    private final AtomicLong cacheHits = new AtomicLong(0);
    private final AtomicLong cacheMisses = new AtomicLong(0);
    private final AtomicLong databaseQueries = new AtomicLong(0);

    public RedisCacheService(ConsistentHashRing hashRing, CacheConfig cacheConfig) {
        this.hashRing = hashRing;
        this.cacheConfig = cacheConfig;
        initializePools();
    }

    // Configures connection pool sizes, idle thresholds, and test validations.
    private void initializePools() {
        JedisPoolConfig poolConfig = new JedisPoolConfig();
        poolConfig.setMaxTotal(16); // Maximum of 16 active connections per node pool.
        poolConfig.setMaxIdle(8);   // Maintain up to 8 idle connections to prevent reconnection delay.
        poolConfig.setMinIdle(2);   // Always retain at least 2 active socket connections.
        poolConfig.setTestOnBorrow(true); // Verifies socket validity (PING) before giving it to a caller.

        for (CacheConfig.RedisNodeConfig node : cacheConfig.getNodes()) {
            JedisPool pool = new JedisPool(poolConfig, node.getHost(), node.getPort());
            pools.put(node.getName(), pool);
        }
    }

    public void incrementHits() { cacheHits.incrementAndGet(); }
    public void incrementMisses() { cacheMisses.incrementAndGet(); }
    public void incrementDbQueries() { databaseQueries.incrementAndGet(); }

    // Fetches key value from whichever node it belongs to based on the Consistent Hash Ring.
    public String get(String key) {
        String nodeName = hashRing.getNode(key);
        if (nodeName == null) return null;

        JedisPool pool = pools.get(nodeName);
        if (pool == null) return null;

        // Try-with-resources: automatically returns the Jedis resource back to the pool.
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
            incrementMisses(); // Safe fallback: treat errors as cache misses.
            return null;
        }
    }

    // Writes key value to its designated Redis node with an expiration TTL.
    public void put(String key, String value) {
        String nodeName = hashRing.getNode(key);
        if (nodeName == null) return;

        JedisPool pool = pools.get(nodeName);
        if (pool == null) return;

        try (Jedis jedis = pool.getResource()) {
            // SETEX: atomically sets the key value and configures it to expire after ttlSeconds.
            jedis.setex(key, cacheConfig.getTtlSeconds(), value);
        } catch (Exception e) {
            System.err.println("Error writing to Redis Node " + nodeName + ": " + e.getMessage());
        }
    }

    // Deletes/invalidates key on its designated node.
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

    // Scans keyspaces of all nodes in a non-blocking manner using SCAN instead of KEYS.
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

    // Bundles node configurations and telemetry counts for frontend dashboard polling.
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
                    // Node is offline/unreachable
                }
            }
            nodeMap.put("online", isOnline);
            nodeDetails.add(nodeMap);
        }
        
        stats.put("nodes", nodeDetails);
        stats.put("keys", getActiveKeysPerNode());
        return stats;
    }

    @PreDestroy // Spring triggers this before stopping to release system resources cleanly.
    public void closePools() {
        for (JedisPool pool : pools.values()) {
            try {
                pool.close();
            } catch (Exception e) {
                // Ignore failure during close
            }
        }
    }
}
```

---

## 2. Database & Scoring Strategies

### A. [`ScoringStrategy.java`](file:///c:/Users/vangs/cursor/HLD/src/main/java/com/typeahead/scoring/ScoringStrategy.java)
Defines an interchangeable contract for dynamic suggestion scoring.

```java
package com.typeahead.scoring;

import com.typeahead.entity.SearchQueryEntity;

public interface ScoringStrategy {
    // Calculates score using current JVM clock time ( LocalDateTime now) for decay checks.
    double score(SearchQueryEntity entity, java.time.LocalDateTime now);

    // SQL sorting logic fragment injected into native query calls.
    String getSqlOrderExpression();

    double getDayWeight();
    double getWeekWeight();
    double getMonthWeight();
    String getName();
}
```

---

### B. [`WeightedDecayScoringStrategy.java`](file:///c:/Users/vangs/cursor/HLD/src/main/java/com/typeahead/scoring/WeightedDecayScoringStrategy.java)
Implements configurable time-decayed ranking: `score = day*0.6 + week*0.3 + month*0.1`.

```java
package com.typeahead.scoring;

import com.typeahead.entity.SearchQueryEntity;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component("weightedDecayScoringStrategy")
// Dynamically active when typeahead.scoring.strategy is omitted or set to 'weighted-decay'.
@ConditionalOnProperty(
    name = "typeahead.scoring.strategy",
    havingValue = "weighted-decay",
    matchIfMissing = true
)
public class WeightedDecayScoringStrategy implements ScoringStrategy {

    private final double dayWeight;
    private final double weekWeight;
    private final double monthWeight;

    // Configured via standard application properties injection.
    public WeightedDecayScoringStrategy(
            @org.springframework.beans.factory.annotation.Value("${typeahead.scoring.day-weight:0.6}") double dayWeight,
            @org.springframework.beans.factory.annotation.Value("${typeahead.scoring.week-weight:0.3}") double weekWeight,
            @org.springframework.beans.factory.annotation.Value("${typeahead.scoring.month-weight:0.1}") double monthWeight) {
        this.dayWeight = dayWeight;
        this.weekWeight = weekWeight;
        this.monthWeight = monthWeight;
    }

    @Override
    public double score(SearchQueryEntity entity, java.time.LocalDateTime now) {
        if (entity.getLastUpdated() == null) {
            return 0.0;
        }

        long dayCount = entity.getDayCount();
        long weekCount = entity.getWeekCount();
        long monthCount = entity.getMonthCount();

        // 1. Same-Day Check: if last_updated was yesterday, today's active count is 0.
        if (!entity.getLastUpdated().toLocalDate().equals(now.toLocalDate())) {
            dayCount = 0;
        }

        // 2. Same-Week Check: compares Monday boundaries of the last_updated week and now week.
        java.time.LocalDate lastUpdatedMon = entity.getLastUpdated().toLocalDate()
                .with(java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY));
        java.time.LocalDate nowMon = now.toLocalDate()
                .with(java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY));
        if (!lastUpdatedMon.equals(nowMon)) {
            weekCount = 0;
        }

        // 3. Same-Month Check.
        if (entity.getLastUpdated().getYear() != now.getYear() ||
            entity.getLastUpdated().getMonth() != now.getMonth()) {
            monthCount = 0;
        }

        return (dayCount * dayWeight)
             + (weekCount * weekWeight)
             + (monthCount * monthWeight);
    }

    @Override
    public String getSqlOrderExpression() {
        return "(day_count * :dayW + week_count * :weekW + month_count * :monthW) DESC";
    }

    @Override
    public double getDayWeight()   { return dayWeight; }
    @Override
    public double getWeekWeight()  { return weekWeight; }
    @Override
    public double getMonthWeight() { return monthWeight; }
    @Override
    public String getName() { return "weighted-decay"; }
}
```

---

### C. [`SearchQueryRepository.java`](file:///c:/Users/vangs/cursor/HLD/src/main/java/com/typeahead/repository/SearchQueryRepository.java)
Handles native queries and coordinates database persistence.

```java
package com.typeahead.repository;

import com.typeahead.entity.SearchQueryEntity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface SearchQueryRepository extends JpaRepository<SearchQueryEntity, Long> {

    // Native query mapping: Orders matching queries using weights passed as parameters from the strategy.
    @Query(value = """
        SELECT * FROM search_queries
        WHERE LOWER(query) LIKE LOWER(CONCAT(:prefix, '%'))
        ORDER BY (day_count * :dayW + week_count * :weekW + month_count * :monthW) DESC
        """,
        nativeQuery = true)
    List<SearchQueryEntity> findTopByPrefix(
        @Param("prefix") String prefix,
        @Param("dayW")   double dayWeight,
        @Param("weekW")  double weekWeight,
        @Param("monthW") double monthWeight,
        Pageable pageable);

    // Upsert query used for recording single searches (fallback / legacy code path).
    // ON CONFLICT: checks query uniqueness. If duplicate, compares dates to reset/increment.
    @Modifying
    @Transactional
    @Query(value = """
        INSERT INTO search_queries (query, day_count, week_count, month_count, last_updated)
        VALUES (:query, 1, 1, 1, NOW())
        ON CONFLICT (query) DO UPDATE SET
            day_count = CASE
                WHEN DATE(search_queries.last_updated) < DATE(NOW()) THEN 1
                ELSE search_queries.day_count + 1
            END,
            week_count = CASE
                WHEN DATE_TRUNC('week', search_queries.last_updated) < DATE_TRUNC('week', NOW()) THEN 1
                ELSE search_queries.week_count + 1
            END,
            month_count = CASE
                WHEN DATE_TRUNC('month', search_queries.last_updated) < DATE_TRUNC('month', NOW()) THEN 1
                ELSE search_queries.month_count + 1
            END,
            last_updated = NOW()
        """,
        nativeQuery = true)
    void upsertQuery(@Param("query") String query);
}
```

---

## 3. Buffering & Asynchronous Processing

### A. [`SearchQueryBatchWriter.java`](file:///c:/Users/vangs/cursor/HLD/src/main/java/com/typeahead/service/SearchQueryBatchWriter.java)
Buffers search query logs in-memory and handles highly optimized JDBC batch flushes asynchronously.

```java
package com.typeahead.service;

import com.typeahead.cache.RedisCacheService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.BatchPreparedStatementSetter;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class SearchQueryBatchWriter {

    private final JdbcTemplate jdbcTemplate; // Executes native SQL batch operations.
    private final RedisCacheService cacheService;
    private final int maxSize; // Flush threshold size.

    private final Object flushLock = new Object(); // Synchronizes flush executions.
    private final AtomicInteger totalHits = new AtomicInteger(0); // Tracks cumulative buffered queries count.
    
    // Concurrent map buffering [query_string -> hit_increment_count] in memory.
    private ConcurrentHashMap<String, Integer> buffer = new ConcurrentHashMap<>();

    public SearchQueryBatchWriter(
            JdbcTemplate jdbcTemplate,
            RedisCacheService cacheService,
            @Value("${typeahead.batch.max-size:100}") int maxSize) {
        this.jdbcTemplate = jdbcTemplate;
        this.cacheService = cacheService;
        this.maxSize = maxSize;
    }

    // Queues a user search submission.
    public void queueSearch(String query) {
        if (query == null || query.trim().isEmpty()) {
            return;
        }
        String normalized = query.trim().toLowerCase();

        // Atomic map merge: increments query frequency safely across threads.
        buffer.merge(normalized, 1, Integer::sum);

        // Check if the accumulated writes hit the threshold limit.
        if (totalHits.incrementAndGet() >= maxSize) {
            // Run flush asynchronously using CompletableFuture to avoid blocking the calling client HTTP thread.
            java.util.concurrent.CompletableFuture.runAsync(this::flush);
        }
    }

    // Background Scheduler: flushes the buffer if the timer expires (default: every 5000ms).
    @Scheduled(fixedDelayString = "${typeahead.batch.flush-interval-ms:5000}")
    public void scheduledFlush() {
        flush();
    }

    // Flushes all buffered queries to PostgreSQL.
    public void flush() {
        ConcurrentHashMap<String, Integer> oldBuffer;

        // Atomic swap operation: swaps reference in a minimal lock scope.
        synchronized (flushLock) {
            if (buffer.isEmpty()) {
                return;
            }
            oldBuffer = buffer;
            buffer = new ConcurrentHashMap<>();
            totalHits.set(0); // Reset count back to zero.
        }

        System.out.println("[Batch Write] Flushing " + oldBuffer.size() + " unique queries to database...");

        // Optimized SQL Batch Query:
        // EXCLUDED.day_count contains the aggregated hits count (N) collected in our memory buffer.
        // It updates current counts by EXCLUDED.day_count or resets them to EXCLUDED.day_count on time boundary crossings.
        String sql = """
            INSERT INTO search_queries (query, day_count, week_count, month_count, last_updated)
            VALUES (?, ?, ?, ?, NOW())
            ON CONFLICT (query) DO UPDATE SET
                day_count = CASE
                    WHEN DATE(search_queries.last_updated) < DATE(NOW()) THEN EXCLUDED.day_count
                    ELSE search_queries.day_count + EXCLUDED.day_count
                END,
                week_count = CASE
                    WHEN DATE_TRUNC('week', search_queries.last_updated) < DATE_TRUNC('week', NOW()) THEN EXCLUDED.week_count
                    ELSE search_queries.week_count + EXCLUDED.week_count
                END,
                month_count = CASE
                    WHEN DATE_TRUNC('month', search_queries.last_updated) < DATE_TRUNC('month', NOW()) THEN EXCLUDED.month_count
                    ELSE search_queries.month_count + EXCLUDED.month_count
                END,
                last_updated = NOW()
            """;

        List<Map.Entry<String, Integer>> entries = new ArrayList<>(oldBuffer.entrySet());

        try {
            // Executes all queries in a single multi-row prepared statement batch execution block.
            jdbcTemplate.batchUpdate(sql, new BatchPreparedStatementSetter() {
                @Override
                public void setValues(PreparedStatement ps, int i) throws SQLException {
                    Map.Entry<String, Integer> entry = entries.get(i);
                    ps.setString(1, entry.getKey());
                    ps.setLong(2, entry.getValue());
                    ps.setLong(3, entry.getValue());
                    ps.setLong(4, entry.getValue());
                }

                @Override
                public int getBatchSize() {
                    return entries.size();
                }
            });

            System.out.println("[Batch Write] Successfully flushed " + entries.size() + " items. Evicting prefix cache keys...");

            // Coordinated Cache Eviction:
            // Evict prefixes for all items ONLY AFTER successful DB commit.
            // This prevents stale suggest queries on cache invalidations.
            for (Map.Entry<String, Integer> entry : entries) {
                String query = entry.getKey();
                for (int k = 1; k <= query.length(); k++) {
                    String prefix = query.substring(0, k);
                    cacheService.evict("suggest:" + prefix);
                }
            }

        } catch (Exception e) {
            System.err.println("[Batch Write Error] Failed to flush search query batch: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
```
