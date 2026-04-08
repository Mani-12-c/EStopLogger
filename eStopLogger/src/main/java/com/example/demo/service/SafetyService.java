package com.example.demo.service;

import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.model.dto.EStopEventDTO;
import com.example.demo.model.entity.*;
import com.example.demo.model.enums.EventStatus;
import com.example.demo.model.enums.HmiState;
import com.example.demo.model.enums.Severity;
import com.example.demo.repository.EStopEventRepository;
import com.example.demo.repository.FactoryRepository;
import com.example.demo.repository.StationRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
public class SafetyService {

    private final EStopEventRepository eventRepository;
    private final StationRepository stationRepository;
    private final FactoryRepository factoryRepository;
    private final CorrelationService correlationService;
    private final RiskScoringService riskScoringService;
    private final HmiService hmiService;
    private final NotificationService notificationService;
    private final AuditService auditService;

    @Autowired
    public SafetyService(EStopEventRepository eventRepository,
                         StationRepository stationRepository,
                         FactoryRepository factoryRepository,
                         CorrelationService correlationService,
                         RiskScoringService riskScoringService,
                         HmiService hmiService,
                         NotificationService notificationService,
                         AuditService auditService) {
        this.eventRepository = eventRepository;
        this.stationRepository = stationRepository;
        this.factoryRepository = factoryRepository;
        this.correlationService = correlationService;
        this.riskScoringService = riskScoringService;
        this.hmiService = hmiService;
        this.notificationService = notificationService;
        this.auditService = auditService;
    }

    /**
     * Central handler for processing a new E-Stop event.
     * 1. Save event as OPEN
     * 2. Detect rapid sequential presses
     * 3. Correlate with scheduled work
     * 4. Calculate risk score
     * 5. Update HMI state
     * 6. Log to audit
     */
    @Transactional
    public EStopEvent processNewEvent(EStopEventDTO dto) {
        Station station = stationRepository.findById(dto.getStationId())
                .orElseThrow(() -> new ResourceNotFoundException("Station", "id", dto.getStationId()));

        Factory factory = factoryRepository.findById(dto.getFactoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Factory", "id", dto.getFactoryId()));

        LocalDateTime pressedAt = dto.getPressedAt() != null ? dto.getPressedAt() : LocalDateTime.now();

        // 1. Create and save the event
        EStopEvent event = EStopEvent.builder()
                .station(station)
                .factory(factory)
                .blockId(dto.getBlockId())
                .pressedAt(pressedAt)
                .eventStatus(EventStatus.OPEN)
                .severity(Severity.MEDIUM)
                .isRapidSequence(false)
                .riskScore(0)
                .build();

        event = eventRepository.save(event);

        // 2. Check for rapid sequential press (same station, within 5 seconds)
        boolean isRapid = checkRapidSequence(station.getStationId(), pressedAt);
        if (isRapid) {
            event.setIsRapidSequence(true);
            event.setEventStatus(EventStatus.CRITICAL);
            event.setSeverity(Severity.CRITICAL);
            log.warn("RAPID SEQUENCE DETECTED at Station {} - Event {}", station.getStationId(), event.getEventId());

            // Auto-dispatch immediately for rapid sequence
            notificationService.autoDispatch(event, null, "Rapid sequential E-Stop press detected");
            auditService.logAction(event, "RAPID_SEQUENCE_DETECTED", null,
                    "2nd press within 5 seconds at station " + station.getStationName());
        }

        // 3. Correlate with scheduled work
        ScheduledWork correlatedWork = correlationService.correlate(event);
        if (correlatedWork != null) {
            event.setCorrelatedWork(correlatedWork);
            auditService.logAction(event, "CORRELATION_DETECTED", null,
                    correlatedWork.getWorkType() + " work in progress at station");
        }

        // 4. Calculate risk score
        int riskScore = riskScoringService.calculateRiskScore(event);
        event.setRiskScore(riskScore);

        // If rapid sequence, auto-dispatch with work context
        if (isRapid && correlatedWork != null) {
            notificationService.autoDispatch(event, correlatedWork,
                    "Rapid sequence during " + correlatedWork.getWorkType());
            event.setEventStatus(EventStatus.AUTO_DISPATCHED);
        }

        event = eventRepository.save(event);

        // 5. Update HMI state to RED
        hmiService.updateState(station.getStationId(), HmiState.RED);

        // 6. Audit log
        auditService.logAction(event, "E-STOP_PRESSED", null,
                String.format("Station %s, Block %s, Factory %s",
                        station.getStationName(), dto.getBlockId(), factory.getFactoryName()));

        log.info("E-Stop event processed: eventId={}, stationId={}, status={}, riskScore={}",
                event.getEventId(), station.getStationId(), event.getEventStatus(), riskScore);

        return event;
    }

    /**
     * Checks if there was a recent press from the same station within 5 seconds.
     */
    private boolean checkRapidSequence(Long stationId, LocalDateTime pressedAt) {
        LocalDateTime windowStart = pressedAt.minusSeconds(5);
        List<EStopEvent> recentEvents = eventRepository.findByStationAndTimeRange(
                stationId, windowStart, pressedAt);

        // If there's at least 1 other event in the 5-second window
        return !recentEvents.isEmpty();
    }

    /**
     * Retrieves an event by ID with validation.
     */
    public EStopEvent getEventById(Long eventId) {
        return eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("EStopEvent", "id", eventId));
    }
}
