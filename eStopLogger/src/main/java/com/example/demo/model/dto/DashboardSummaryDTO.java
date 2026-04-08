package com.example.demo.model.dto;

import lombok.*;
import java.util.Map;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class DashboardSummaryDTO {

    private Long totalEventsToday;
    private Long totalEventsThisWeek;
    private Long openEvents;
    private Long escalatedEvents;
    private Double meanAckTimeSeconds;
    private Map<String, Long> eventsBySeverity;
    private Map<String, Long> eventsByShift;
    private java.util.List<String> highRiskStations;
}
