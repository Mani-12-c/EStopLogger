package com.example.demo.model.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "risk_score_history")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class RiskScoreHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "station_id", nullable = false)
    private Station station;

    @Column(name = "work_type", nullable = false, length = 50)
    private String workType;

    @Column(name = "risk_score", nullable = false)
    private Integer riskScore;

    @Column(name = "week_number", nullable = false)
    private Integer weekNumber;

    @Column(name = "event_count", nullable = false)
    private Integer eventCount;

    @Column(name = "calculated_at", updatable = false)
    private LocalDateTime calculatedAt;

    @PrePersist
    protected void onCreate() {
        this.calculatedAt = LocalDateTime.now();
    }
}
