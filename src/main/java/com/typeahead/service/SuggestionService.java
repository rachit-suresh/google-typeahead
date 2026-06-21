package com.typeahead.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.typeahead.cache.RedisCacheService;
import com.typeahead.dto.SuggestionResponse;
import com.typeahead.repository.SearchQueryRepository;
import com.typeahead.scoring.ScoringStrategy;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

@Service
public class SuggestionService {

    private final SearchQueryRepository repository;
    private final RedisCacheService cacheService;
    private final ScoringStrategy scoringStrategy;
    private final SearchQueryBatchWriter batchWriter;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final int limit;

    public SuggestionService(
            SearchQueryRepository repository,
            RedisCacheService cacheService,
            ScoringStrategy scoringStrategy,
            SearchQueryBatchWriter batchWriter,
            @Value("${typeahead.suggestion.limit:10}") int limit) {
        this.repository = repository;
        this.cacheService = cacheService;
        this.scoringStrategy = scoringStrategy;
        this.batchWriter = batchWriter;
        this.limit = limit;
    }

    public List<SuggestionResponse> getSuggestions(String prefix) {
        if (prefix == null || prefix.trim().isEmpty()) {
            return Collections.emptyList();
        }

        String normalizedPrefix = prefix.trim().toLowerCase();
        String cacheKey = "suggest:" + normalizedPrefix;

        // 1. Check cache first
        try {
            String cachedValue = cacheService.get(cacheKey);
            if (cachedValue != null) {
                return objectMapper.readValue(cachedValue, new TypeReference<List<SuggestionResponse>>() {});
            }
        } catch (Exception e) {
            System.err.println("[Cache Error] Failed to read/deserialize cache for prefix: " + normalizedPrefix + ", details: " + e.getMessage());
        }

        // 2. Cache miss: read from Database
        cacheService.incrementDbQueries();
        LocalDateTime now = LocalDateTime.now();
        List<SuggestionResponse> suggestions = repository.findTopByPrefix(
                    normalizedPrefix,
                    scoringStrategy.getDayWeight(),
                    scoringStrategy.getWeekWeight(),
                    scoringStrategy.getMonthWeight(),
                    PageRequest.of(0, limit)
                )
                .stream()
                .map(entity -> {
                    double score = scoringStrategy.score(entity, now);
                    return new SuggestionResponse(
                        entity.getQuery(),
                        Math.round(score), // Backward compatibility with count
                        score,
                        entity.getDayCount(),
                        entity.getWeekCount(),
                        entity.getMonthCount()
                    );
                })
                .sorted((a, b) -> Double.compare(b.score(), a.score()))
                .toList();

        // 3. Write back to cache
        try {
            String json = objectMapper.writeValueAsString(suggestions);
            cacheService.put(cacheKey, json);
        } catch (Exception e) {
            System.err.println("[Cache Error] Failed to serialize/write cache for prefix: " + normalizedPrefix + ", details: " + e.getMessage());
        }

        return suggestions;
    }

    public void recordSearch(String query) {
        // Delegate write to memory buffer for batch writes
        batchWriter.queueSearch(query);
    }
}
