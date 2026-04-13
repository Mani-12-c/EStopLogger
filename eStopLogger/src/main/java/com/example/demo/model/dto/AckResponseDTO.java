package com.example.demo.model.dto;

import lombok.*;
import java.time.LocalDateTime;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class AckResponseDTO {

    private Long ackId;
    private Long eventId;
    private String username;
    private String role;
    private LocalDateTime acknowledgedAt;
    private String resolutionCategory;
    private String customResolutionText;
    private Boolean ackWithinThreshold;
}
