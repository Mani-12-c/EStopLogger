package com.example.demo.repository;

import com.example.demo.model.entity.EStopEvent;
import com.example.demo.model.enums.EventStatus;
import com.example.demo.model.enums.Severity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface EStopEventRepository extends JpaRepository<EStopEvent, Long> {

    List<EStopEvent> findByEventStatus(EventStatus status);

    List<EStopEvent> findByStation_StationId(Long stationId);

    @Query("SELECT e FROM EStopEvent e WHERE e.eventStatus = :status AND e.pressedAt < :threshold")
    List<EStopEvent> findUnacknowledgedBefore(@Param("status") EventStatus status,
                                              @Param("threshold") LocalDateTime threshold);

    @Query("SELECT e FROM EStopEvent e WHERE e.station.stationId = :stationId " +
           "AND e.pressedAt BETWEEN :start AND :end ORDER BY e.pressedAt DESC")
    List<EStopEvent> findByStationAndTimeRange(@Param("stationId") Long stationId,
                                               @Param("start") LocalDateTime start,
                                               @Param("end") LocalDateTime end);

    @Query("SELECT e FROM EStopEvent e WHERE e.eventStatus IN :statuses AND e.station.stationId = :stationId")
    List<EStopEvent> findActiveEventsByStation(@Param("stationId") Long stationId,
                                               @Param("statuses") List<EventStatus> statuses);

    @Query("SELECT COUNT(e) FROM EStopEvent e WHERE e.station.stationId = :stationId " +
           "AND e.pressedAt >= :since")
    Long countByStationSince(@Param("stationId") Long stationId,
                             @Param("since") LocalDateTime since);

    @Query("SELECT COUNT(e) FROM EStopEvent e WHERE e.pressedAt >= :since")
    Long countEventsSince(@Param("since") LocalDateTime since);

    @Query("SELECT COUNT(e) FROM EStopEvent e WHERE e.eventStatus = :status")
    Long countByStatus(@Param("status") EventStatus status);

    @Query("SELECT e.severity, COUNT(e) FROM EStopEvent e WHERE e.pressedAt >= :since " +
           "GROUP BY e.severity")
    List<Object[]> countBySeveritySince(@Param("since") LocalDateTime since);

    @Query("SELECT e FROM EStopEvent e WHERE e.pressedAt BETWEEN :from AND :to")
    List<EStopEvent> findByDateRange(@Param("from") LocalDateTime from,
                                     @Param("to") LocalDateTime to);

    @Query("SELECT e FROM EStopEvent e WHERE " +
           "(:status IS NULL OR e.eventStatus = :status) AND " +
           "(:severity IS NULL OR e.severity = :severity) AND " +
           "(:stationId IS NULL OR e.station.stationId = :stationId) AND " +
           "(:factoryId IS NULL OR e.factory.factoryId = :factoryId) AND " +
           "(:from IS NULL OR e.pressedAt >= :from) AND " +
           "(:to IS NULL OR e.pressedAt <= :to)")
    Page<EStopEvent> findWithFilters(@Param("status") EventStatus status,
                                     @Param("severity") Severity severity,
                                     @Param("stationId") Long stationId,
                                     @Param("factoryId") String factoryId,
                                     @Param("from") LocalDateTime from,
                                     @Param("to") LocalDateTime to,
                                     Pageable pageable);

    @Query("SELECT e.station.stationId, e.station.stationName, COUNT(e), AVG(e.riskScore) " +
           "FROM EStopEvent e GROUP BY e.station.stationId, e.station.stationName " +
           "ORDER BY COUNT(e) DESC")
    List<Object[]> findStationEventStats();

    @Query("SELECT COUNT(e) FROM EStopEvent e WHERE e.station.stationId = :stationId " +
           "AND e.eventStatus IN :statuses")
    Long countActiveByStation(@Param("stationId") Long stationId,
                              @Param("statuses") List<EventStatus> statuses);

    @Query("SELECT e.station.stationId, COUNT(e) FROM EStopEvent e " +
           "WHERE e.isRapidSequence = true AND e.pressedAt >= :since " +
           "GROUP BY e.station.stationId")
    List<Object[]> countRapidSequenceByStationSince(@Param("since") LocalDateTime since);
}
