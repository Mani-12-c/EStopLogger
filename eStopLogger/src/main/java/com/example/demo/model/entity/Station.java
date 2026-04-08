package com.example.demo.model.entity;

import com.example.demo.model.enums.HmiState;
import com.example.demo.model.enums.StationStatus;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "station")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Station {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "station_id")
    private Long stationId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "factory_id", nullable = false)
    private Factory factory;

    @Column(name = "block_id", nullable = false, length = 20)
    private String blockId;

    @Column(name = "station_name", nullable = false, length = 100)
    private String stationName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private StationStatus status = StationStatus.ACTIVE;

    @Enumerated(EnumType.STRING)
    @Column(name = "current_hmi_state", nullable = false)
    @Builder.Default
    private HmiState currentHmiState = HmiState.GREEN;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
