package com.typeahead.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

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

    @Column(name = "count", nullable = false)
    private long count;
}
