package com.example.demo.repository;

import com.example.demo.model.entity.ScheduledWork;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ScheduledWorkRepository extends JpaRepository<ScheduledWork, Long> {

    @Query("SELECT sw FROM ScheduledWork sw WHERE " +
           "(sw.station.stationId = :stationId OR (sw.factory.factoryId = :factoryId AND sw.blockId = :blockId)) " +
           "AND :pressedAt BETWEEN sw.startTime AND sw.endTime")
    List<ScheduledWork> findOverlappingWork(@Param("stationId") Long stationId,
                                            @Param("factoryId") String factoryId,
                                            @Param("blockId") String blockId,
                                            @Param("pressedAt") LocalDateTime pressedAt);

    /**
     * Fallback: find work at the same station/factory/block on the same day,
     * even if pressedAt doesn't fall exactly within the work window.
     */
    @Query("SELECT sw FROM ScheduledWork sw WHERE " +
           "(sw.station.stationId = :stationId OR (sw.factory.factoryId = :factoryId AND sw.blockId = :blockId)) " +
           "AND sw.startTime >= :dayStart AND sw.endTime <= :dayEnd " +
           "ORDER BY sw.riskLevel DESC")
    List<ScheduledWork> findSameDayWork(@Param("stationId") Long stationId,
                                        @Param("factoryId") String factoryId,
                                        @Param("blockId") String blockId,
                                        @Param("dayStart") LocalDateTime dayStart,
                                        @Param("dayEnd") LocalDateTime dayEnd);

    List<ScheduledWork> findByStation_StationId(Long stationId);

    @Query("SELECT sw FROM ScheduledWork sw WHERE sw.startTime <= :now AND sw.endTime >= :now")
    List<ScheduledWork> findCurrentlyActive(@Param("now") LocalDateTime now);
}
