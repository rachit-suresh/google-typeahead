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

    private final JdbcTemplate jdbcTemplate;
    private final RedisCacheService cacheService;
    private final int maxSize;

    private final Object flushLock = new Object();
    private final AtomicInteger totalHits = new AtomicInteger(0);
    private ConcurrentHashMap<String, Integer> buffer = new ConcurrentHashMap<>();

    public SearchQueryBatchWriter(
            JdbcTemplate jdbcTemplate,
            RedisCacheService cacheService,
            @Value("${typeahead.batch.max-size:100}") int maxSize) {
        this.jdbcTemplate = jdbcTemplate;
        this.cacheService = cacheService;
        this.maxSize = maxSize;
    }

    public void queueSearch(String query) {
        if (query == null || query.trim().isEmpty()) {
            return;
        }
        String normalized = query.trim().toLowerCase();

        // Increment the query frequency in our in-memory map
        buffer.merge(normalized, 1, Integer::sum);

        // Check if we hit the batch size threshold — flush asynchronously to avoid blocking the caller
        if (totalHits.incrementAndGet() >= maxSize) {
            java.util.concurrent.CompletableFuture.runAsync(this::flush);
        }
    }

    @Scheduled(fixedDelayString = "${typeahead.batch.flush-interval-ms:5000}")
    public void scheduledFlush() {
        flush();
    }

    public void flush() {
        ConcurrentHashMap<String, Integer> oldBuffer;

        // Atomically swap the buffer reference to avoid block contention
        synchronized (flushLock) {
            if (buffer.isEmpty()) {
                return;
            }
            oldBuffer = buffer;
            buffer = new ConcurrentHashMap<>();
            totalHits.set(0);
        }

        System.out.println("[Batch Write] Flushing " + oldBuffer.size() + " unique queries to database...");

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
            // Execute highly optimized batch update in a single database transaction
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

            // Evict prefixes for all items that were successfully written to database
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
