package com.example.demo.repository;

import com.example.demo.model.entity.RiskScoreHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RiskScoreHistoryRepository extends JpaRepository<RiskScoreHistory, Long> {

    @Query("SELECT r FROM RiskScoreHistory r WHERE r.station.stationId = :stationId " +
           "ORDER BY r.weekNumber DESC")
    List<RiskScoreHistory> findByStationOrderByWeek(@Param("stationId") Long stationId);

    @Query("SELECT r FROM RiskScoreHistory r WHERE r.station.stationId = :stationId " +
           "AND r.weekNumber >= :fromWeek ORDER BY r.weekNumber ASC")
    List<RiskScoreHistory> findByStationAndWeekRange(@Param("stationId") Long stationId,
                                                     @Param("fromWeek") Integer fromWeek);
}
