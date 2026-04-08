package com.example.demo.model.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.time.LocalDateTime;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class EStopEventDTO {

    private Long eventId;

    @NotNull(message = "Station ID is required")
    private Long stationId;

    @NotBlank(message = "Factory ID is required")
    private String factoryId;

    @NotBlank(message = "Block ID is required")
    private String blockId;

    private LocalDateTime pressedAt;

    private String eventStatus;
    private String severity;
    private Boolean isRapidSequence;
    private Long correlatedWorkId;
    private Integer riskScore;
    private String stationName;
    private String factoryName;
    private String workType;
    private LocalDateTime createdAt;
}
