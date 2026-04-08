package com.example.demo.model.entity;

import com.example.demo.model.enums.RiskLevel;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "scheduled_work")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ScheduledWork {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "work_id")
    private Long workId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "station_id", nullable = false)
    private Station station;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "factory_id", nullable = false)
    private Factory factory;

    @Column(name = "block_id", nullable = false, length = 20)
    private String blockId;

    @Column(name = "work_type", nullable = false, length = 50)
    private String workType;

    @Column(name = "probable_emergency", length = 100)
    private String probableEmergency;

    @Column(name = "instant_help", length = 200)
    private String instantHelp;

    @Column(name = "start_time", nullable = false)
    private LocalDateTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalDateTime endTime;

    @Enumerated(EnumType.STRING)
    @Column(name = "risk_level")
    @Builder.Default
    private RiskLevel riskLevel = RiskLevel.LOW;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
