package com.typeahead.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.typeahead.cache.RedisCacheService;
import com.typeahead.dto.SuggestionResponse;
import com.typeahead.repository.SearchQueryRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;

@Service
public class SuggestionService {

    private final SearchQueryRepository repository;
    private final RedisCacheService cacheService;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final int limit;

    public SuggestionService(
            SearchQueryRepository repository,
            RedisCacheService cacheService,
            @Value("${typeahead.suggestion.limit:10}") int limit) {
        this.repository = repository;
        this.cacheService = cacheService;
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
        List<SuggestionResponse> suggestions = repository.findTopByPrefix(normalizedPrefix, PageRequest.of(0, limit))
                .stream()
                .map(entity -> new SuggestionResponse(entity.getQuery(), entity.getCount()))
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
        if (query == null || query.trim().isEmpty()) {
            return;
        }

        String normalizedQuery = query.trim().toLowerCase();
        
        // 1. Record search in PostgreSQL
        repository.upsertQuery(normalizedQuery);
        
        // 2. Evict cache keys for all prefixes of the query to prevent stale suggestions
        for (int i = 1; i <= normalizedQuery.length(); i++) {
            String prefix = normalizedQuery.substring(0, i);
            String cacheKey = "suggest:" + prefix;
            cacheService.evict(cacheKey);
        }
    }
}
