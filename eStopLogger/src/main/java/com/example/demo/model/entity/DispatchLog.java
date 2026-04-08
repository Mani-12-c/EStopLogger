package com.example.demo.model.entity;

import com.example.demo.model.enums.DispatchType;
import com.example.demo.model.enums.ResponseStatus;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "dispatch_log")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class DispatchLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "dispatch_id")
    private Long dispatchId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "event_id", nullable = false)
    private EStopEvent event;

    @Enumerated(EnumType.STRING)
    @Column(name = "dispatch_type", nullable = false)
    private DispatchType dispatchType;

    @Column(name = "dispatched_at", nullable = false)
    private LocalDateTime dispatchedAt;

    @Column(name = "trigger_reason", nullable = false, length = 200)
    private String triggerReason;

    @Enumerated(EnumType.STRING)
    @Column(name = "response_status")
    @Builder.Default
    private ResponseStatus responseStatus = ResponseStatus.DISPATCHED;

    @Column(columnDefinition = "TEXT")
    private String notes;
}
