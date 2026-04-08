package com.example.demo.model.dto;

import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class EventTimelineDTO {

    private Long eventId;
    private List<TimelineEntry> timeline;

    @Getter @Setter
    @NoArgsConstructor @AllArgsConstructor
    @Builder
    public static class TimelineEntry {
        private LocalDateTime time;
        private String action;
        private String by;
        private String details;
    }
}
