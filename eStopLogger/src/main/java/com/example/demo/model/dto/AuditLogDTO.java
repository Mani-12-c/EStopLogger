package com.example.demo.model.dto;

import lombok.*;
import java.time.LocalDateTime;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class AuditLogDTO {

    private Long auditId;
    private Long eventId;
    private String action;
    private Long performedBy;
    private String performedByName;
    private LocalDateTime timestamp;
    private String details;
    private String ipAddress;
}
