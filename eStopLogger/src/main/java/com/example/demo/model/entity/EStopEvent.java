package com.example.demo.model.entity;

import com.example.demo.model.enums.EventStatus;
import com.example.demo.model.enums.Severity;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "estop_event")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class EStopEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "event_id")
    private Long eventId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "station_id", nullable = false)
    private Station station;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "factory_id", nullable = false)
    private Factory factory;

    @Column(name = "block_id", nullable = false, length = 20)
    private String blockId;

    @Column(name = "pressed_at", nullable = false)
    private LocalDateTime pressedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_status", nullable = false)
    @Builder.Default
    private EventStatus eventStatus = EventStatus.OPEN;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Severity severity = Severity.MEDIUM;

    @Column(name = "is_rapid_sequence")
    @Builder.Default
    private Boolean isRapidSequence = false;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "correlated_work_id")
    private ScheduledWork correlatedWork;

    @Column(name = "risk_score")
    @Builder.Default
    private Integer riskScore = 0;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
