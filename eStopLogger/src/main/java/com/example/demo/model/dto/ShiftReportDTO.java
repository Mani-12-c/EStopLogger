package com.example.demo.model.dto;

import lombok.*;
import java.util.Map;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ShiftReportDTO {

    private String date;
    private Map<String, Long> eventsByShift;
    private Map<String, Double> avgAckTimeByShift;
    private Map<String, Long> escalationsByShift;
}
