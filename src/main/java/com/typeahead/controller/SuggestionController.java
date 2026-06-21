package com.typeahead.controller;

import com.typeahead.dto.SuggestionResponse;
import com.typeahead.service.SuggestionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

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
}
