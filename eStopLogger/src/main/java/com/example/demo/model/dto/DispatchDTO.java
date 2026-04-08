package com.example.demo.model.dto;

import lombok.*;
import java.time.LocalDateTime;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class DispatchDTO {

    private Long dispatchId;
    private Long eventId;
    private String dispatchType;
    private LocalDateTime dispatchedAt;
    private String triggerReason;
    private String responseStatus;
    private String notes;
}
