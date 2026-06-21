package com.typeahead.dto;

public record SuggestionResponse(
    String query,
    long count, // Backward compatibility with frontend
    double score,
    long dayCount,
    long weekCount,
    long monthCount
) {}
