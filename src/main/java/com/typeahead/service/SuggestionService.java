package com.typeahead.service;

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
    private final int limit;

    public SuggestionService(
            SearchQueryRepository repository,
            @Value("${typeahead.suggestion.limit:10}") int limit) {
        this.repository = repository;
        this.limit = limit;
    }

    public List<SuggestionResponse> getSuggestions(String prefix) {
        if (prefix == null || prefix.trim().isEmpty()) {
            return Collections.emptyList();
        }

        String normalizedPrefix = prefix.trim().toLowerCase();

        return repository.findTopByPrefix(normalizedPrefix, PageRequest.of(0, limit))
                .stream()
                .map(entity -> new SuggestionResponse(entity.getQuery(), entity.getCount()))
                .toList();
    }

    public void recordSearch(String query) {
        if (query == null || query.trim().isEmpty()) {
            return;
        }

        String normalizedQuery = query.trim().toLowerCase();
        repository.upsertQuery(normalizedQuery);
    }
}
