package com.example.demo.service;

import com.example.demo.model.entity.DispatchLog;
import com.example.demo.model.entity.EStopEvent;
import com.example.demo.model.entity.ScheduledWork;
import com.example.demo.model.enums.DispatchType;
import com.example.demo.model.enums.ResponseStatus;
import com.example.demo.repository.DispatchLogRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
public class NotificationService {

    private final DispatchLogRepository dispatchLogRepository;

    @Autowired
    public NotificationService(DispatchLogRepository dispatchLogRepository) {
        this.dispatchLogRepository = dispatchLogRepository;
    }

    /**
     * Auto-dispatches emergency services based on the event and associated work.
     */
    @Transactional
    public void autoDispatch(EStopEvent event, ScheduledWork work, String reason) {
        DispatchType dispatchType = determineDispatchType(work);

        DispatchLog dispatch = DispatchLog.builder()
                .event(event)
                .dispatchType(dispatchType)
                .dispatchedAt(LocalDateTime.now())
                .triggerReason(reason)
                .responseStatus(ResponseStatus.DISPATCHED)
                .notes(buildDispatchNotes(event, work))
                .build();

        dispatchLogRepository.save(dispatch);

        log.warn("AUTO-DISPATCH: {} sent for Station {}, Event {} - Reason: {}",
                dispatchType, event.getStation().getStationId(), event.getEventId(), reason);
    }

    /**
     * Sends a supervisor alert for an escalated event.
     */
    @Transactional
    public void alertSupervisor(EStopEvent event) {
        String notes = buildDispatchNotes(event, event.getCorrelatedWork());

        DispatchLog dispatch = DispatchLog.builder()
                .event(event)
                .dispatchType(DispatchType.SUPERVISOR_ALERT)
                .dispatchedAt(LocalDateTime.now())
                .triggerReason("Unacknowledged event for >2 minutes")
                .responseStatus(ResponseStatus.DISPATCHED)
                .notes(notes)
                .build();

        dispatchLogRepository.save(dispatch);

        log.warn("SUPERVISOR ALERT: Unacknowledged event {} at Station {}",
                event.getEventId(), event.getStation().getStationId());
    }

    /**
     * Dispatches detailed help when an operator acknowledges as REAL_EMERGENCY.
     */
    @Transactional
    public void sendDetailedHelp(EStopEvent event, ScheduledWork work) {
        DispatchType dispatchType = determineDispatchType(work);

        DispatchLog dispatch = DispatchLog.builder()
                .event(event)
                .dispatchType(dispatchType)
                .dispatchedAt(LocalDateTime.now())
                .triggerReason("Operator confirmed REAL_EMERGENCY")
                .responseStatus(ResponseStatus.DISPATCHED)
                .notes("Detailed help dispatched after operator confirmation")
                .build();

        dispatchLogRepository.save(dispatch);

        log.warn("DETAILED HELP: {} dispatched for confirmed emergency at Station {}, Event {}",
                dispatchType, event.getStation().getStationId(), event.getEventId());
    }

    /**
     * Retrieves dispatch logs for a specific event.
     */
    public List<DispatchLog> getDispatchesForEvent(Long eventId) {
        return dispatchLogRepository.findByEvent_EventId(eventId);
    }

    /**
     * Determines the appropriate dispatch type based on the scheduled work.
     */
    private DispatchType determineDispatchType(ScheduledWork work) {
        if (work == null) return DispatchType.SUPERVISOR_ALERT;

        return switch (work.getWorkType().toLowerCase()) {
            case "electrical", "electrical work" -> DispatchType.ALL_EMERGENCY;
            case "chemical", "chemical handling" -> DispatchType.ALL_EMERGENCY;
            case "welding" -> DispatchType.FIRE_DEPT;
            case "mechanical", "mechanical maintenance" -> DispatchType.AMBULANCE;
            default -> DispatchType.SUPERVISOR_ALERT;
        };
    }

    private String buildDispatchNotes(EStopEvent event, ScheduledWork work) {
        StringBuilder notes = new StringBuilder();
        notes.append("Station: ").append(event.getStation().getStationName());
        notes.append(", Block: ").append(event.getBlockId());
        notes.append(", Factory: ").append(event.getFactory().getFactoryName());
        if (work != null) {
            notes.append(", Work Type: ").append(work.getWorkType());
            notes.append(", Probable Emergency: ").append(work.getProbableEmergency());
        }
        return notes.toString();
    }
}
