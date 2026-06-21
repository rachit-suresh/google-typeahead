package com.typeahead.scheduler;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.typeahead.cache.RedisCacheService;
import com.typeahead.dto.SuggestionResponse;
import com.typeahead.entity.SearchQueryEntity;
import com.typeahead.repository.SearchQueryRepository;
import com.typeahead.scoring.ScoringStrategy;
import com.typeahead.service.SuggestionService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.*;

@Component
public class CacheWarmupScheduler {

    private final SearchQueryRepository repository;
    private final SuggestionService suggestionService;
    private final RedisCacheService cacheService;
    private final ScoringStrategy scoringStrategy;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private final boolean enabled;
    private final int topQueriesLimit;

    public CacheWarmupScheduler(
            SearchQueryRepository repository,
            SuggestionService suggestionService,
            RedisCacheService cacheService,
            ScoringStrategy scoringStrategy,
            @Value("${typeahead.cache.warmup.enabled:true}") boolean enabled,
            @Value("${typeahead.cache.warmup.top-queries-limit:10000}") int topQueriesLimit) {
        this.repository = repository;
        this.suggestionService = suggestionService;
        this.cacheService = cacheService;
        this.scoringStrategy = scoringStrategy;
        this.enabled = enabled;
        this.topQueriesLimit = topQueriesLimit;
    }

    @Scheduled(fixedRateString = "${typeahead.cache.warmup.fixed-rate-ms:300000}")
    public void warmUpCache() {
        if (!enabled) {
            System.out.println("[Cache WarmUp] Scheduler is disabled. Skipping.");
            return;
        }

        System.out.println("[Cache WarmUp] Starting high-performance in-memory cache pre-warming...");
        long startTime = System.currentTimeMillis();

        try {
            // 1. Fetch top 100,000 popular queries globally to cover Zipf's Law distribution
            int fetchLimit = 100000;
            List<SearchQueryEntity> popularQueries = repository.findTopQueries(
                    scoringStrategy.getDayWeight(),
                    scoringStrategy.getWeekWeight(),
                    scoringStrategy.getMonthWeight(),
                    PageRequest.of(0, fetchLimit)
            );

            if (popularQueries.isEmpty()) {
                System.out.println("[Cache WarmUp] Database is empty. Skipping pre-warming.");
                return;
            }

            System.out.println("[Cache WarmUp] Fetched " + popularQueries.size() + " top queries in " + (System.currentTimeMillis() - startTime) + " ms. Processing prefixes...");

            // 2. Build the prefix-to-suggestions map in memory
            LocalDateTime now = LocalDateTime.now();
            Map<String, List<SuggestionResponse>> prefixMap = new HashMap<>();

            for (SearchQueryEntity entity : popularQueries) {
                String query = entity.getQuery();
                if (query == null || query.trim().isEmpty()) {
                    continue;
                }
                String normalizedQuery = query.trim().toLowerCase();
                double score = scoringStrategy.score(entity, now);
                SuggestionResponse response = new SuggestionResponse(
                        entity.getQuery(),
                        Math.round(score),
                        score,
                        entity.getDayCount(),
                        entity.getWeekCount(),
                        entity.getMonthCount()
                );

                // Generate prefixes up to length 10
                int maxLength = Math.min(normalizedQuery.length(), 10);
                for (int i = 1; i <= maxLength; i++) {
                    String prefix = normalizedQuery.substring(0, i);
                    List<SuggestionResponse> list = prefixMap.computeIfAbsent(prefix, k -> new ArrayList<>(10));
                    if (list.size() < 10) {
                        list.add(response);
                    }
                }
            }

            // 3. Serialize suggestions payloads
            Map<String, String> cachePayloads = new HashMap<>();
            for (Map.Entry<String, List<SuggestionResponse>> entry : prefixMap.entrySet()) {
                String cacheKey = "suggest:" + entry.getKey();
                String json = objectMapper.writeValueAsString(entry.getValue());
                cachePayloads.put(cacheKey, json);
            }

            System.out.println("[Cache WarmUp] Built " + cachePayloads.size() + " prefix suggestion payloads. Flashing to Redis nodes using pipelines...");

            // 4. Flush to Redis cluster using pipelined writes
            cacheService.putAllPipelined(cachePayloads);

            long duration = System.currentTimeMillis() - startTime;
            System.out.println("[Cache WarmUp] Successfully pre-warmed " + cachePayloads.size() + " keys in " + duration + " ms.");
        } catch (Exception e) {
            System.err.println("[Cache WarmUp] Error occurred during scheduled cache warm-up: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
