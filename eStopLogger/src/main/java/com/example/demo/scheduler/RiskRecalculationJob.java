package com.example.demo.scheduler;

import com.example.demo.model.entity.RiskScoreHistory;
import com.example.demo.model.entity.Station;
import com.example.demo.repository.EStopEventRepository;
import com.example.demo.repository.RiskScoreHistoryRepository;
import com.example.demo.repository.StationRepository;
import com.example.demo.util.RiskScoreUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.WeekFields;
import java.util.List;
import java.util.Locale;

@Slf4j
@Component
public class RiskRecalculationJob {

    private final StationRepository stationRepository;
    private final EStopEventRepository eventRepository;
    private final RiskScoreHistoryRepository riskScoreHistoryRepository;

    @Autowired
    public RiskRecalculationJob(StationRepository stationRepository,
                                EStopEventRepository eventRepository,
                                RiskScoreHistoryRepository riskScoreHistoryRepository) {
        this.stationRepository = stationRepository;
        this.eventRepository = eventRepository;
        this.riskScoreHistoryRepository = riskScoreHistoryRepository;
    }

    /**
     * Runs every Sunday at midnight to recalculate risk scores for all stations
     * based on the previous week's event data.
     */
    @Scheduled(cron = "0 0 0 * * SUN")
    @Transactional
    public void recalculateWeeklyRiskScores() {
        log.info("Starting weekly risk score recalculation...");

        LocalDateTime weekStart = LocalDate.now().minusWeeks(1).atStartOfDay();
        int weekNumber = LocalDate.now().get(WeekFields.of(Locale.getDefault()).weekOfYear());

        List<Station> stations = stationRepository.findAll();

        for (Station station : stations) {
            Long eventCount = eventRepository.countByStationSince(
                    station.getStationId(), weekStart);

            if (eventCount > 0) {
                int riskScore = RiskScoreUtil.calculateRiskScore(
                        null, eventCount, false, false);

                RiskScoreHistory history = RiskScoreHistory.builder()
                        .station(station)
                        .workType("ALL")
                        .riskScore(riskScore)
                        .weekNumber(weekNumber)
                        .eventCount(eventCount.intValue())
                        .build();

                riskScoreHistoryRepository.save(history);
            }
        }

        log.info("Weekly risk recalculation completed for {} stations", stations.size());
    }
}
