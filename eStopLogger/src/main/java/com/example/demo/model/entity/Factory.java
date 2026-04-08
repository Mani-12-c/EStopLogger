package com.example.demo.model.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "factory")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Factory {

    @Id
    @Column(name = "factory_id", length = 20)
    private String factoryId;

    @Column(name = "factory_name", nullable = false, length = 100)
    private String factoryName;

    @Column(length = 200)
    private String location;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
