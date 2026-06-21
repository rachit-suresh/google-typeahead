package com.typeahead.scoring;

import com.typeahead.entity.SearchQueryEntity;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Alternative scoring strategy using equal weights across all time windows.
 *
 * <p>Formula: score = dayCount + weekCount + monthCount
 *
 * <p>Use this when you want pure cumulative popularity with no recency bias.
 * Active when {@code typeahead.scoring.strategy=equal-weight}.
 */
@Component("equalWeightScoringStrategy")
@ConditionalOnProperty(
    name = "typeahead.scoring.strategy",
    havingValue = "equal-weight"
)
public class EqualWeightScoringStrategy implements ScoringStrategy {

    @Override
    public double score(SearchQueryEntity entity, java.time.LocalDateTime now) {
        if (entity.getLastUpdated() == null) {
            return 0.0;
        }

        long dayCount = entity.getDayCount();
        long weekCount = entity.getWeekCount();
        long monthCount = entity.getMonthCount();

        // 1. Check if same day
        if (!entity.getLastUpdated().toLocalDate().equals(now.toLocalDate())) {
            dayCount = 0;
        }

        // 2. Check if same week (starting Monday)
        java.time.LocalDate lastUpdatedMon = entity.getLastUpdated().toLocalDate()
                .with(java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY));
        java.time.LocalDate nowMon = now.toLocalDate()
                .with(java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY));
        if (!lastUpdatedMon.equals(nowMon)) {
            weekCount = 0;
        }

        // 3. Check if same month
        if (entity.getLastUpdated().getYear() != now.getYear() ||
            entity.getLastUpdated().getMonth() != now.getMonth()) {
            monthCount = 0;
        }

        return dayCount + weekCount + monthCount;
    }

    @Override
    public String getSqlOrderExpression() {
        // All weights are 1.0 — just use the same parameterized form for consistency
        return "(day_count * :dayW + week_count * :weekW + month_count * :monthW) DESC";
    }

    @Override
    public double getDayWeight()   { return 1.0; }

    @Override
    public double getWeekWeight()  { return 1.0; }

    @Override
    public double getMonthWeight() { return 1.0; }

    @Override
    public String getName() { return "equal-weight"; }
}
