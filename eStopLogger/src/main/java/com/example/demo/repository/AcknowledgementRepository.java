package com.example.demo.repository;

import com.example.demo.model.entity.Acknowledgement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface AcknowledgementRepository extends JpaRepository<Acknowledgement, Long> {

    Optional<Acknowledgement> findByEvent_EventId(Long eventId);

    boolean existsByEvent_EventId(Long eventId);

    @Query(value = "SELECT AVG(TIMESTAMPDIFF(SECOND, e.pressed_at, a.acknowledged_at)) " +
           "FROM acknowledgement a JOIN estop_event e ON a.event_id = e.event_id " +
           "WHERE a.acknowledged_at BETWEEN :from AND :to and a.ack_within_threshold<> 0", nativeQuery = true)
    Double findAverageAckTime(@Param("from") LocalDateTime from,
                              @Param("to") LocalDateTime to);

    @Query(value = "SELECT AVG(TIMESTAMPDIFF(SECOND, e.pressed_at, a.acknowledged_at)) " +
           "FROM acknowledgement a JOIN estop_event e ON a.event_id = e.event_id where  a.ack_within_threshold<> 0", nativeQuery = true)
    Double findAverageAckTimeOverall();

    @Query(value = "SELECT AVG(TIMESTAMPDIFF(SECOND, e.pressed_at, a.acknowledged_at)) " +
           "FROM acknowledgement a JOIN estop_event e ON a.event_id = e.event_id " +
           "WHERE e.station_id = :stationId " +
           "AND a.acknowledged_at BETWEEN :from AND :to", nativeQuery = true)
    Double findAverageAckTimeByStation(@Param("stationId") Long stationId,
                                       @Param("from") LocalDateTime from,
                                       @Param("to") LocalDateTime to);

    @Query("SELECT COUNT(a) FROM Acknowledgement a WHERE a.ackWithinThreshold = true " +
           "AND a.acknowledgedAt >= :since")
    Long countAckedWithinThreshold(@Param("since") LocalDateTime since);

    List<Acknowledgement> findByEvent_Station_StationId(Long stationId);
}
