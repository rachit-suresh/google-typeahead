package com.typeahead.scoring;

import com.typeahead.entity.SearchQueryEntity;

/**
 * Strategy interface for computing a trending score from time-windowed search counts.
 *
 * <p>Implementations determine how day_count, week_count, and month_count are combined
 * into a single ranking score. This makes the ranking logic interchangeable without
 * touching the repository or service layer.
 *
 * <p>To add a new strategy:
 * 1. Create a class implementing this interface and annotate it with @Component.
 * 2. Give it a unique {@link #getName()} value.
 * 3. Configure {@code typeahead.scoring.strategy} in application.yml to select it.
 */
public interface ScoringStrategy {

    /**
     * Computes a composite ranking score for a search query entity.
     *
     * @param entity the search query with time-windowed count fields
     * @param now the current date/time to evaluate time-window boundaries
     * @return a non-negative score; higher means more trending
     */
    double score(SearchQueryEntity entity, java.time.LocalDateTime now);

    /**
     * Returns the SQL ORDER BY expression fragment that matches this strategy's logic.
     *
     * <p>This allows the database to pre-sort results efficiently before Java re-ranks them.
     * Use named parameters {@code :dayW}, {@code :weekW}, {@code :monthW} for weight injection.
     *
     * @return a SQL expression string, e.g. "(day_count * 0.6 + week_count * 0.3 + month_count * 0.1)"
     */
    String getSqlOrderExpression();

    /**
     * Day-count weight passed to the SQL query as a bind parameter.
     */
    double getDayWeight();

    /**
     * Week-count weight passed to the SQL query as a bind parameter.
     */
    double getWeekWeight();

    /**
     * Month-count weight passed to the SQL query as a bind parameter.
     */
    double getMonthWeight();

    /**
     * Unique identifier for this strategy, used for configuration and logging.
     */
    String getName();
}
