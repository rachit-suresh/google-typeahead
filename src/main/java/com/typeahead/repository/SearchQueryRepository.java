package com.typeahead.repository;

import com.typeahead.entity.SearchQueryEntity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface SearchQueryRepository extends JpaRepository<SearchQueryEntity, Long> {

    /**
     * Finds the top matching suggestions for a prefix, ordered by a weighted composite score.
     *
     * <p>The weights (:dayW, :weekW, :monthW) are injected by whichever {@link com.typeahead.scoring.ScoringStrategy}
     * is active, making the ordering logic interchangeable without changing this query's structure.
     */
    @Query(value = """
        SELECT * FROM search_queries
        WHERE query LIKE CONCAT(:prefix, '%')
        ORDER BY (day_count * :dayW + week_count * :weekW + month_count * :monthW) DESC
        """,
        nativeQuery = true)
    List<SearchQueryEntity> findTopByPrefix(
        @Param("prefix") String prefix,
        @Param("dayW")   double dayWeight,
        @Param("weekW")  double weekWeight,
        @Param("monthW") double monthWeight,
        Pageable pageable);

    /**
     * Atomically upserts a query and applies lazy calendar-based resets.
     *
     * <p>On INSERT: sets all three counters to 1 and last_updated to NOW().
     *
     * <p>On CONFLICT (existing query): uses CASE WHEN to compare the current date/week/month
     * against last_updated. If the calendar boundary has crossed, the counter resets to 1
     * (a new period started). Otherwise it increments by 1. This is 100% atomic — no
     * background scheduler or separate queries needed.
     */
    @Modifying
    @Transactional
    @Query(value = """
        INSERT INTO search_queries (query, day_count, week_count, month_count, last_updated)
        VALUES (:query, 1, 1, 1, NOW())
        ON CONFLICT (query) DO UPDATE SET
            day_count = CASE
                WHEN DATE(search_queries.last_updated) < DATE(NOW()) THEN 1
                ELSE search_queries.day_count + 1
            END,
            week_count = CASE
                WHEN DATE_TRUNC('week', search_queries.last_updated) < DATE_TRUNC('week', NOW()) THEN 1
                ELSE search_queries.week_count + 1
            END,
            month_count = CASE
                WHEN DATE_TRUNC('month', search_queries.last_updated) < DATE_TRUNC('month', NOW()) THEN 1
                ELSE search_queries.month_count + 1
            END,
            last_updated = NOW()
        """,
        nativeQuery = true)
    void upsertQuery(@Param("query") String query);

    /**
     * Finds the top popular search queries globally, ordered by the dynamic weighted score.
     */
    @Query(value = """
        SELECT * FROM search_queries
        ORDER BY (day_count * :dayW + week_count * :weekW + month_count * :monthW) DESC
        """,
        nativeQuery = true)
    List<SearchQueryEntity> findTopQueries(
        @Param("dayW")   double dayWeight,
        @Param("weekW")  double weekWeight,
        @Param("monthW") double monthWeight,
        Pageable pageable);
}
