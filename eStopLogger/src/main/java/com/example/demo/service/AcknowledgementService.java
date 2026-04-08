package com.example.demo.service;

import com.example.demo.model.dto.AckRequestDTO;
import com.example.demo.model.dto.AckResponseDTO;
import com.example.demo.model.entity.*;
import com.example.demo.model.enums.EventStatus;
import com.example.demo.model.enums.HmiState;
import com.example.demo.model.enums.ResolutionCategory;
import com.example.demo.exception.DuplicateAckException;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.repository.AcknowledgementRepository;
import com.example.demo.repository.EStopEventRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.util.TimeUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Slf4j
@Service
public class AcknowledgementService {

    private final AcknowledgementRepository ackRepository;
    private final EStopEventRepository eventRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final HmiService hmiService;
    private final AuditService auditService;

    @Autowired
    public AcknowledgementService(AcknowledgementRepository ackRepository,
                                  EStopEventRepository eventRepository,
                                  UserRepository userRepository,
                                  NotificationService notificationService,
                                  HmiService hmiService,
                                  AuditService auditService) {
        this.ackRepository = ackRepository;
        this.eventRepository = eventRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
        this.hmiService = hmiService;
        this.auditService = auditService;
    }

    /**
     * Acknowledges an E-Stop event with the given resolution category.
     */
    @Transactional
    public AckResponseDTO acknowledgeEvent(Long eventId, AckRequestDTO request, String username) {
        // Validate event exists
        EStopEvent event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("EStopEvent", "id", eventId));

        // Check for duplicate acknowledgement
        if (ackRepository.existsByEvent_EventId(eventId)) {
            throw new DuplicateAckException(eventId);
        }

        // Validate custom resolution text for CUSTOM_RESOLUTION
        if (request.getResolutionCategory() == ResolutionCategory.CUSTOM_RESOLUTION
                && (request.getCustomResolutionText() == null || request.getCustomResolutionText().isBlank())) {
            throw new IllegalArgumentException("Custom resolution text is required for CUSTOM_RESOLUTION");
        }

        // Get the user
        AppUser user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", username));

        LocalDateTime now = LocalDateTime.now();
        boolean withinThreshold = TimeUtil.diffInSeconds(event.getPressedAt(), now)
                <= TimeUtil.ESCALATION_THRESHOLD_SECONDS;

        // Create acknowledgement
        Acknowledgement ack = Acknowledgement.builder()
                .event(event)
                .user(user)
                .acknowledgedAt(now)
                .resolutionCategory(request.getResolutionCategory())
                .customResolutionText(request.getCustomResolutionText())
                .ackWithinThreshold(withinThreshold)
                .build();

        ackRepository.save(ack);

        // Update event status
        event.setEventStatus(EventStatus.ACKNOWLEDGED);
        eventRepository.save(event);

        // If REAL_EMERGENCY, dispatch detailed help
        if (request.getResolutionCategory() == ResolutionCategory.REAL_EMERGENCY) {
            notificationService.sendDetailedHelp(event, event.getCorrelatedWork());
            auditService.logAction(event, "REAL_EMERGENCY_CONFIRMED", user.getUserId(),
                    "Operator confirmed real emergency - detailed help dispatched");
        }

        // Resolve the event
        event.setEventStatus(EventStatus.RESOLVED);
        eventRepository.save(event);

        // Update HMI state
        hmiService.refreshHmiState(event.getStation().getStationId());

        // Audit log
        auditService.logAction(event, "ACKNOWLEDGED", user.getUserId(),
                String.format("Resolution: %s, Within threshold: %s",
                        request.getResolutionCategory(), withinThreshold));

        log.info("Event {} acknowledged by {} as {} (within threshold: {})",
                eventId, username, request.getResolutionCategory(), withinThreshold);

        return AckResponseDTO.builder()
                .ackId(ack.getAckId())
                .eventId(eventId)
                .username(username)
                .acknowledgedAt(now)
                .resolutionCategory(request.getResolutionCategory().name())
                .customResolutionText(request.getCustomResolutionText())
                .ackWithinThreshold(withinThreshold)
                .build();
    }
}
