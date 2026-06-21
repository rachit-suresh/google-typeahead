package com.typeahead.controller;

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

@CrossOrigin(origins = "http://localhost:5173")
@RestController
public class SuggestionController {

    private final SuggestionService suggestionService;

    public SuggestionController(SuggestionService suggestionService) {
        this.suggestionService = suggestionService;
    }

    @GetMapping("/suggest")
    public ResponseEntity<List<SuggestionResponse>> getSuggestions(
            @RequestParam(value = "q", required = false) String prefix) {
        List<SuggestionResponse> suggestions = suggestionService.getSuggestions(prefix);
        return ResponseEntity.ok(suggestions);
    }

    @PostMapping("/search")
    public ResponseEntity<SearchResponse> recordSearch(@RequestBody SearchRequest request) {
        suggestionService.recordSearch(request.query());
        return ResponseEntity.ok(new SearchResponse("Searched"));
    }
}
