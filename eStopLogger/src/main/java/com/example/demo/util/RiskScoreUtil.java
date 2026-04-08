package com.example.demo.util;

import com.example.demo.model.enums.RiskLevel;

public final class RiskScoreUtil {

    private RiskScoreUtil() {
        // Utility class
    }

    /**
     * Returns the base risk score based on work type.
     * Chemical Handling = 90, Electrical = 70, Welding = 50, Mechanical = 30, default = 10
     */
    public static int getBaseScore(String workType) {
        if (workType == null) return 10;

        return switch (workType.toLowerCase()) {
            case "chemical", "chemical handling" -> 90;
            case "electrical", "electrical work" -> 70;
            case "welding" -> 50;
            case "mechanical", "mechanical maintenance" -> 30;
            default -> 10;
        };
    }

    /**
     * Calculates the frequency bonus: events this week × 5, capped at 25.
     */
    public static int getFrequencyBonus(long eventsThisWeek) {
        return (int) Math.min(eventsThisWeek * 5, 25);
    }

    /**
     * Returns a time bonus of +15 if the event occurred during historically risky hours.
     */
    public static int getTimeBonus(boolean isRiskyHour) {
        return isRiskyHour ? 15 : 0;
    }

    /**
     * Returns a rapid-sequence bonus of +25 if detected.
     */
    public static int getRapidSequenceBonus(boolean isRapidSequence) {
        return isRapidSequence ? 25 : 0;
    }

    /**
     * Calculates the full risk score, capped at 100.
     */
    public static int calculateRiskScore(String workType, long eventsThisWeek,
                                         boolean isRiskyHour, boolean isRapidSequence) {
        int score = getBaseScore(workType)
                + getFrequencyBonus(eventsThisWeek)
                + getTimeBonus(isRiskyHour)
                + getRapidSequenceBonus(isRapidSequence);

        return Math.min(score, 100);
    }

    /**
     * Converts a numeric risk score to a RiskLevel enum.
     */
    public static RiskLevel toRiskLevel(int riskScore) {
        if (riskScore <= 25) return RiskLevel.LOW;
        if (riskScore <= 50) return RiskLevel.MEDIUM;
        if (riskScore <= 75) return RiskLevel.HIGH;
        return RiskLevel.CRITICAL;
    }
}
