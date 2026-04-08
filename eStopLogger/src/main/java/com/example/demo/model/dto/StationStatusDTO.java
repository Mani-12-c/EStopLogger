package com.example.demo.model.dto;

import lombok.*;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class StationStatusDTO {

    private Long stationId;
    private String stationName;
    private String factoryId;
    private String factoryName;
    private String blockId;
    private String status;
    private String currentHmiState;
    private Long openEventCount;
}
