package com.example.demo.service;

import com.example.demo.model.entity.EStopEvent;
import com.example.demo.model.entity.ScheduledWork;
import com.example.demo.model.enums.Severity;
import com.example.demo.repository.ScheduledWorkRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
public class CorrelationService {

    private final ScheduledWorkRepository scheduledWorkRepository;

    @Autowired
    public CorrelationService(ScheduledWorkRepository scheduledWorkRepository) {
        this.scheduledWorkRepository = scheduledWorkRepository;
    }

    /**
     * Correlates an E-Stop event with any overlapping scheduled work.
     * Matches by station ID or (factoryId + blockId) within the time range.
     * Returns the most relevant (highest risk) scheduled work, or null if none.
     */
    public ScheduledWork correlate(EStopEvent event) {
        List<ScheduledWork> overlappingWork = scheduledWorkRepository.findOverlappingWork(
                event.getStation().getStationId(),
                event.getFactory().getFactoryId(),
                event.getBlockId(),
                event.getPressedAt());

        if (overlappingWork.isEmpty()) {
            log.debug("No scheduled work overlap for event {} at station {}",
                    event.getEventId(), event.getStation().getStationId());
            return null;
        }

        // Return the highest-risk work if multiple overlaps
        ScheduledWork bestMatch = overlappingWork.stream()
                .max((a, b) -> a.getRiskLevel().compareTo(b.getRiskLevel()))
                .orElse(overlappingWork.get(0));

        log.info("Event {} correlated with {} work (workId={}, riskLevel={})",
                event.getEventId(), bestMatch.getWorkType(),
                bestMatch.getWorkId(), bestMatch.getRiskLevel());

        return bestMatch;
    }

    /**
     * Determines the appropriate severity based on the work type.
     */
    public Severity determineSeverityFromWorkType(String workType) {
        if (workType == null) return Severity.MEDIUM;

        return switch (workType.toLowerCase()) {
            case "chemical", "chemical handling" -> Severity.CRITICAL;
            case "electrical", "electrical work" -> Severity.HIGH;
            case "welding" -> Severity.MEDIUM;
            case "mechanical", "mechanical maintenance" -> Severity.LOW;
            default -> Severity.MEDIUM;
        };
    }

    /**
     * Gets the type of instant help needed based on work type.
     */
    public String getInstantHelpType(ScheduledWork work) {
        if (work == null || work.getInstantHelp() != null) {
            return work != null ? work.getInstantHelp() : "Alert Supervisor";
        }

        return switch (work.getWorkType().toLowerCase()) {
            case "electrical", "electrical work" -> "Send Ambulance / Fire Dept";
            case "chemical", "chemical handling" -> "Send Hazmat / Ambulance / Fire Dept";
            case "welding" -> "Send Fire Dept / Ambulance";
            case "mechanical", "mechanical maintenance" -> "Send Ambulance";
            default -> "Alert Supervisor";
        };
    }
}
