package com.typeahead.scoring;

import com.typeahead.entity.SearchQueryEntity;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Default scoring strategy using configurable time-decay weights.
 *
 * <p>Formula: score = (dayCount × dayWeight) + (weekCount × weekWeight) + (monthCount × monthWeight)
 *
 * <p>Default weights prioritise recency:
 * <ul>
 *   <li>day_count  × 0.6 — searches in the last 24 hours are the strongest signal</li>
 *   <li>week_count × 0.3 — weekly volume provides medium-term trending context</li>
 *   <li>month_count × 0.1 — monthly volume provides a long-term popularity baseline</li>
 * </ul>
 *
 * <p>Active when {@code typeahead.scoring.strategy=weighted-decay} (the default).
 */
@Component("weightedDecayScoringStrategy")
@ConditionalOnProperty(
    name = "typeahead.scoring.strategy",
    havingValue = "weighted-decay",
    matchIfMissing = true
)
public class WeightedDecayScoringStrategy implements ScoringStrategy {

    private final double dayWeight;
    private final double weekWeight;
    private final double monthWeight;

    public WeightedDecayScoringStrategy(
            @org.springframework.beans.factory.annotation.Value("${typeahead.scoring.day-weight:0.6}") double dayWeight,
            @org.springframework.beans.factory.annotation.Value("${typeahead.scoring.week-weight:0.3}") double weekWeight,
            @org.springframework.beans.factory.annotation.Value("${typeahead.scoring.month-weight:0.1}") double monthWeight) {
        this.dayWeight = dayWeight;
        this.weekWeight = weekWeight;
        this.monthWeight = monthWeight;
    }

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

        return (dayCount * dayWeight)
             + (weekCount * weekWeight)
             + (monthCount * monthWeight);
    }

    @Override
    public String getSqlOrderExpression() {
        return "(day_count * :dayW + week_count * :weekW + month_count * :monthW) DESC";
    }

    @Override
    public double getDayWeight()   { return dayWeight; }

    @Override
    public double getWeekWeight()  { return weekWeight; }

    @Override
    public double getMonthWeight() { return monthWeight; }

    @Override
    public String getName() { return "weighted-decay"; }
}
