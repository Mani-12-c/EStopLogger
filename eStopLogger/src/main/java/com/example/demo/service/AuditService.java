package com.example.demo.service;

import com.example.demo.model.dto.AuditLogDTO;
import com.example.demo.model.dto.EventTimelineDTO;
import com.example.demo.model.entity.AuditLog;
import com.example.demo.model.entity.EStopEvent;
import com.example.demo.repository.AuditLogRepository;
import com.example.demo.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.PrintWriter;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
public class AuditService {

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;

    @Autowired
    public AuditService(AuditLogRepository auditLogRepository, UserRepository userRepository) {
        this.auditLogRepository = auditLogRepository;
        this.userRepository = userRepository;
    }

    /**
     * Logs an action to the immutable audit trail.
     */
    @Transactional
    public void logAction(EStopEvent event, String action, Long userId, String details) {
        AuditLog auditLog = AuditLog.builder()
                .event(event)
                .action(action)
                .performedBy(userId)
                .timestamp(LocalDateTime.now())
                .details(details)
                .build();

        auditLogRepository.save(auditLog);
        log.debug("Audit log: event={}, action={}, by={}", 
                event != null ? event.getEventId() : "N/A", action, userId);
    }

    /**
     * Retrieves paginated, filtered audit logs.
     */
    public Page<AuditLogDTO> getAuditLogs(Long eventId, String action, Long performedBy,
                                           LocalDateTime from, LocalDateTime to,
                                           Pageable pageable) {
        return auditLogRepository.findWithFilters(eventId, action, performedBy, from, to, pageable)
                .map(this::toDTO);
    }

    /**
     * Builds a timeline of all actions for a specific event.
     */
    public EventTimelineDTO getEventTimeline(Long eventId) {
        List<AuditLog> logs = auditLogRepository.findByEvent_EventIdOrderByTimestampAsc(eventId);

        List<EventTimelineDTO.TimelineEntry> timeline = logs.stream()
                .map(al -> EventTimelineDTO.TimelineEntry.builder()
                        .time(al.getTimestamp())
                        .action(al.getAction())
                        .by(al.getPerformedBy() != null
                                ? userRepository.findById(al.getPerformedBy())
                                    .map(u -> u.getUsername()).orElse("SYSTEM")
                                : "SYSTEM")
                        .details(al.getDetails())
                        .build())
                .collect(Collectors.toList());

        return EventTimelineDTO.builder()
                .eventId(eventId)
                .timeline(timeline)
                .build();
    }

    /**
     * Exports audit logs as CSV bytes for the specified date range.
     */
    public byte[] exportAuditReportCsv(LocalDateTime from, LocalDateTime to) {
        List<AuditLog> logs = auditLogRepository.findByDateRange(from, to);

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PrintWriter writer = new PrintWriter(baos);

        // Header
        writer.println("Audit ID,Event ID,Action,Performed By,Timestamp,Details");

        for (AuditLog al : logs) {
            writer.printf("%d,%s,%s,%s,%s,\"%s\"%n",
                    al.getAuditId(),
                    al.getEvent() != null ? al.getEvent().getEventId() : "",
                    al.getAction(),
                    al.getPerformedBy() != null ? al.getPerformedBy() : "SYSTEM",
                    al.getTimestamp(),
                    al.getDetails() != null ? al.getDetails().replace("\"", "\"\"") : "");
        }

        writer.flush();
        return baos.toByteArray();
    }

    private AuditLogDTO toDTO(AuditLog entity) {
        String performedByName = null;
        if (entity.getPerformedBy() != null) {
            performedByName = userRepository.findById(entity.getPerformedBy())
                    .map(u -> u.getFullName())
                    .orElse("Unknown");
        }

        return AuditLogDTO.builder()
                .auditId(entity.getAuditId())
                .eventId(entity.getEvent() != null ? entity.getEvent().getEventId() : null)
                .action(entity.getAction())
                .performedBy(entity.getPerformedBy())
                .performedByName(performedByName)
                .timestamp(entity.getTimestamp())
                .details(entity.getDetails())
                .ipAddress(entity.getIpAddress())
                .build();
    }
}
