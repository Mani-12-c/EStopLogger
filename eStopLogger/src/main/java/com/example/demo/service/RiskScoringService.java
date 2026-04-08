package com.example.demo.service;

import com.example.demo.model.entity.EStopEvent;
import com.example.demo.model.entity.ScheduledWork;
import com.example.demo.repository.EStopEventRepository;
import com.example.demo.util.RiskScoreUtil;
import com.example.demo.util.TimeUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.temporal.WeekFields;
import java.util.Locale;

@Slf4j
@Service
public class RiskScoringService {

    private final EStopEventRepository eventRepository;

    @Autowired
    public RiskScoringService(EStopEventRepository eventRepository) {
        this.eventRepository = eventRepository;
    }

    /**
     * Calculates the risk score for an E-Stop event.
     * Formula:
     *   baseScore (by workType) + frequencyBonus + timeBonus + rapidSequenceBonus
     *   Capped at 100.
     */
    public int calculateRiskScore(EStopEvent event) {
        // Determine work type from correlated work
        String workType = null;
        if (event.getCorrelatedWork() != null) {
            workType = event.getCorrelatedWork().getWorkType();
        }

        // Count events at this station this week
        LocalDateTime weekStart = event.getPressedAt()
                .with(WeekFields.of(Locale.getDefault()).dayOfWeek(), 1)
                .toLocalDate().atStartOfDay();
        long eventsThisWeek = eventRepository.countByStationSince(
                event.getStation().getStationId(), weekStart);

        // Check if historically risky hour
        boolean isRiskyHour = TimeUtil.isHistoricallyRiskyHour(event.getPressedAt());

        // Check rapid sequence
        boolean isRapid = Boolean.TRUE.equals(event.getIsRapidSequence());

        int score = RiskScoreUtil.calculateRiskScore(workType, eventsThisWeek, isRiskyHour, isRapid);

        log.debug("Risk score for event {}: {} (workType={}, weekEvents={}, riskyHour={}, rapid={})",
                event.getEventId(), score, workType, eventsThisWeek, isRiskyHour, isRapid);

        return score;
    }
}
