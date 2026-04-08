package com.example.demo.util;

import com.example.demo.model.enums.ShiftType;
import java.time.LocalDateTime;
import java.time.LocalTime;

public final class ShiftUtil {

    private static final LocalTime MORNING_START = LocalTime.of(6, 0);
    private static final LocalTime AFTERNOON_START = LocalTime.of(14, 0);
    private static final LocalTime NIGHT_START = LocalTime.of(22, 0);

    private ShiftUtil() {
        // Utility class
    }

    /**
     * Determines the shift type based on the time of day.
     * Morning:   6:00 AM - 2:00 PM
     * Afternoon: 2:00 PM - 10:00 PM
     * Night:     10:00 PM - 6:00 AM
     */
    public static ShiftType getShift(LocalDateTime dateTime) {
        LocalTime time = dateTime.toLocalTime();

        if (!time.isBefore(MORNING_START) && time.isBefore(AFTERNOON_START)) {
            return ShiftType.MORNING;
        } else if (!time.isBefore(AFTERNOON_START) && time.isBefore(NIGHT_START)) {
            return ShiftType.AFTERNOON;
        } else {
            return ShiftType.NIGHT;
        }
    }

    /**
     * Returns the start time of a given shift on a specific date.
     */
    public static LocalDateTime getShiftStart(LocalDateTime date, ShiftType shift) {
        return switch (shift) {
            case MORNING -> date.toLocalDate().atTime(MORNING_START);
            case AFTERNOON -> date.toLocalDate().atTime(AFTERNOON_START);
            case NIGHT -> date.toLocalDate().atTime(NIGHT_START);
        };
    }

    /**
     * Returns the end time of a given shift on a specific date.
     */
    public static LocalDateTime getShiftEnd(LocalDateTime date, ShiftType shift) {
        return switch (shift) {
            case MORNING -> date.toLocalDate().atTime(AFTERNOON_START);
            case AFTERNOON -> date.toLocalDate().atTime(NIGHT_START);
            case NIGHT -> date.toLocalDate().plusDays(1).atTime(MORNING_START);
        };
    }
}
