package com.typeahead.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "search_queries", indexes = {
    @Index(name = "idx_search_queries_query", columnList = "query")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SearchQueryEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "query", nullable = false, unique = true, length = 500)
    private String query;

    @Column(name = "day_count", nullable = false)
    private long dayCount;

    @Column(name = "week_count", nullable = false)
    private long weekCount;

    @Column(name = "month_count", nullable = false)
    private long monthCount;

    @Column(name = "last_updated", nullable = false)
    private LocalDateTime lastUpdated;
}
