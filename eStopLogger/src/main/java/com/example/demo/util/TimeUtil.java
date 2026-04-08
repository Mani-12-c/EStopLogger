package com.example.demo.util;

import java.time.Duration;
import java.time.LocalDateTime;

public final class TimeUtil {

    /** Threshold in seconds for the 2-minute escalation rule. */
    public static final long ESCALATION_THRESHOLD_SECONDS = 120;

    /** Threshold in seconds for rapid sequential press detection. */
    public static final long RAPID_SEQUENCE_THRESHOLD_SECONDS = 5;

    private TimeUtil() {
        // Utility class
    }

    /**
     * Checks if the given event time has exceeded the escalation threshold.
     */
    public static boolean hasExceededEscalationThreshold(LocalDateTime pressedAt) {
        return Duration.between(pressedAt, LocalDateTime.now()).getSeconds() > ESCALATION_THRESHOLD_SECONDS;
    }

    /**
     * Checks if two timestamps are within the rapid-sequence window.
     */
    public static boolean isRapidSequence(LocalDateTime first, LocalDateTime second) {
        long diffSeconds = Math.abs(Duration.between(first, second).getSeconds());
        return diffSeconds <= RAPID_SEQUENCE_THRESHOLD_SECONDS;
    }

    /**
     * Calculates the time difference in seconds between two timestamps.
     */
    public static long diffInSeconds(LocalDateTime from, LocalDateTime to) {
        return Duration.between(from, to).getSeconds();
    }

    /**
     * Checks if a timestamp falls within the historically risky hours (10 AM - 2 PM).
     */
    public static boolean isHistoricallyRiskyHour(LocalDateTime dateTime) {
        int hour = dateTime.getHour();
        return hour >= 10 && hour < 14;
    }
}
