package com.example.demo.model.dto;

import lombok.*;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class StationRiskDTO {

    private Long stationId;
    private String stationName;
    private String factoryId;
    private String blockId;
    private Integer riskScore;
    private Long eventCount;
    private String riskLevel;
}
