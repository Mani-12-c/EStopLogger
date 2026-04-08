package com.example.demo.repository;

import com.example.demo.model.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    List<AuditLog> findByEvent_EventIdOrderByTimestampAsc(Long eventId);

    @Query("SELECT a FROM AuditLog a WHERE " +
           "(:eventId IS NULL OR a.event.eventId = :eventId) AND " +
           "(:action IS NULL OR a.action = :action) AND " +
           "(:performedBy IS NULL OR a.performedBy = :performedBy) AND " +
           "(:from IS NULL OR a.timestamp >= :from) AND " +
           "(:to IS NULL OR a.timestamp <= :to)")
    Page<AuditLog> findWithFilters(@Param("eventId") Long eventId,
                                   @Param("action") String action,
                                   @Param("performedBy") Long performedBy,
                                   @Param("from") LocalDateTime from,
                                   @Param("to") LocalDateTime to,
                                   Pageable pageable);

    @Query("SELECT a FROM AuditLog a WHERE a.timestamp BETWEEN :from AND :to ORDER BY a.timestamp ASC")
    List<AuditLog> findByDateRange(@Param("from") LocalDateTime from,
                                   @Param("to") LocalDateTime to);
}
