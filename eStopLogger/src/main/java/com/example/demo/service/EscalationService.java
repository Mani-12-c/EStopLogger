package com.example.demo.service;

import com.example.demo.model.entity.EStopEvent;
import com.example.demo.model.entity.ScheduledWork;
import com.example.demo.model.enums.EventStatus;
import com.example.demo.model.enums.HmiState;
import com.example.demo.model.enums.Severity;
import com.example.demo.repository.EStopEventRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
public class EscalationService {

    private final EStopEventRepository eventRepository;
    private final CorrelationService correlationService;
    private final NotificationService notificationService;
    private final HmiService hmiService;
    private final AuditService auditService;

    @Autowired
    public EscalationService(EStopEventRepository eventRepository,
                             CorrelationService correlationService,
                             NotificationService notificationService,
                             HmiService hmiService,
                             AuditService auditService) {
        this.eventRepository = eventRepository;
        this.correlationService = correlationService;
        this.notificationService = notificationService;
        this.hmiService = hmiService;
        this.auditService = auditService;
    }

    /**
     * Checks for unacknowledged OPEN events older than 2 minutes and escalates them.
     * Called by the EscalationJob scheduler every 30 seconds.
     */
    @Transactional
    public void checkAndEscalateAll() {
        LocalDateTime threshold = LocalDateTime.now().minusSeconds(120);
        List<EStopEvent> unackedEvents = eventRepository.findUnacknowledgedBefore(
                EventStatus.OPEN, threshold);

        for (EStopEvent event : unackedEvents) {
            escalate(event);
        }

        if (!unackedEvents.isEmpty()) {
            log.info("Escalation check completed: {} events escalated", unackedEvents.size());
        }
    }

    /**
     * Escalates a single event that has not been acknowledged within 2 minutes.
     */
    @Transactional
    public void escalate(EStopEvent event) {
        log.warn("ESCALATING event {} - unacknowledged for >2 minutes at station {}",
                event.getEventId(), event.getStation().getStationId());

        event.setSeverity(Severity.HIGH);

        // Check if there's correlated scheduled work
        ScheduledWork work = event.getCorrelatedWork();
        if (work == null) {
            work = correlationService.correlate(event);
        }

        // Auto-dispatch since no one acknowledged within the threshold
        event.setEventStatus(EventStatus.AUTO_DISPATCHED);
        event.setSeverity(Severity.CRITICAL);

        String reason = "Unacknowledged E-Stop event for >2 minutes";
        if (work != null) {
            reason += " during " + work.getWorkType();
        }

        notificationService.autoDispatch(event, work, reason);
        notificationService.alertSupervisor(event);
        auditService.logAction(event, "AUTO_DISPATCHED", null, reason);

        // Update HMI to RED (keep it red during escalation)
        hmiService.updateState(event.getStation().getStationId(), HmiState.RED);

        eventRepository.save(event);

        auditService.logAction(event, "STATUS_CHANGED", null,
                "OPEN → " + event.getEventStatus().name());
    }
}
