package com.example.demo.model.entity;

import com.example.demo.model.enums.ResolutionCategory;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "acknowledgement")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Acknowledgement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ack_id")
    private Long ackId;

    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "event_id", nullable = false, unique = true)
    private EStopEvent event;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    @Column(name = "acknowledged_at", nullable = false)
    private LocalDateTime acknowledgedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "resolution_category", nullable = false)
    private ResolutionCategory resolutionCategory;

    @Column(name = "custom_resolution_text", columnDefinition = "TEXT")
    private String customResolutionText;

    @Column(name = "ack_within_threshold", nullable = false)
    private Boolean ackWithinThreshold;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
