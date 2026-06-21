package com.typeahead.controller;

import com.typeahead.cache.RedisCacheService;
import com.typeahead.dto.SearchRequest;
import com.typeahead.dto.SearchResponse;
import com.typeahead.dto.SuggestionResponse;
import com.typeahead.service.SuggestionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "http://localhost:5173")
@RestController
public class SuggestionController {

    private final SuggestionService suggestionService;
    private final RedisCacheService cacheService;

    public SuggestionController(SuggestionService suggestionService, RedisCacheService cacheService) {
        this.suggestionService = suggestionService;
        this.cacheService = cacheService;
    }

    @GetMapping("/suggest")
    public ResponseEntity<List<SuggestionResponse>> getSuggestions(
            @RequestParam(value = "q", required = false) String prefix) {
        List<SuggestionResponse> suggestions = suggestionService.getSuggestions(prefix);
        return ResponseEntity.ok(suggestions);
    }

    @PostMapping("/typeahead/record")
    public ResponseEntity<SearchResponse> recordSearch(@RequestBody SearchRequest request) {
        suggestionService.recordSearch(request.query());
        return ResponseEntity.ok(new SearchResponse("Searched"));
    }

    @GetMapping("/cache/stats")
    public ResponseEntity<Map<String, Object>> getCacheStats() {
        return ResponseEntity.ok(cacheService.getCacheStats());
    }
}
