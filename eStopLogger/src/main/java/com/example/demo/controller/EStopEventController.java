package com.example.demo.controller;

import com.example.demo.model.dto.ApiResponse;
import com.example.demo.model.dto.DispatchDTO;
import com.example.demo.model.dto.EStopEventDTO;
import com.example.demo.model.entity.DispatchLog;
import com.example.demo.model.entity.EStopEvent;
import com.example.demo.model.enums.EventStatus;
import com.example.demo.model.enums.Severity;
import com.example.demo.repository.EStopEventRepository;
import com.example.demo.service.NotificationService;
import com.example.demo.service.SafetyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/events")
@Tag(name = "E-Stop Events", description = "E-Stop event creation and retrieval")
public class EStopEventController {

    private final SafetyService safetyService;
    private final EStopEventRepository eventRepository;
    private final NotificationService notificationService;

    @Autowired
    public EStopEventController(SafetyService safetyService,
                                EStopEventRepository eventRepository,
                                NotificationService notificationService) {
        this.safetyService = safetyService;
        this.eventRepository = eventRepository;
        this.notificationService = notificationService;
    }

    @PostMapping
    @Operation(summary = "Create a new E-Stop event")
    public ResponseEntity<ApiResponse<EStopEventDTO>> createEvent(
            @Valid @RequestBody EStopEventDTO request) {
        EStopEvent event = safetyService.processNewEvent(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("E-Stop event created", toDTO(event)));
    }

    @GetMapping
    @Operation(summary = "List events with filters and pagination")
    public ResponseEntity<ApiResponse<Page<EStopEventDTO>>> getEvents(
            @RequestParam(required = false) EventStatus status,
            @RequestParam(required = false) Severity severity,
            @RequestParam(required = false) Long stationId,
            @RequestParam(required = false) String factoryId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "pressedAt,desc") String sort) {

        String[] sortParts = sort.split(",");
        Sort sortObj = Sort.by(sortParts.length > 1 && sortParts[1].equalsIgnoreCase("asc")
                ? Sort.Direction.ASC : Sort.Direction.DESC, sortParts[0]);

        Page<EStopEventDTO> events = eventRepository.findWithFilters(
                        status, severity, stationId, factoryId, from, to,
                        PageRequest.of(page, size, sortObj))
                .map(this::toDTO);

        return ResponseEntity.ok(ApiResponse.success(events));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get single event with full details")
    public ResponseEntity<ApiResponse<EStopEventDTO>> getEvent(@PathVariable Long id) {
        EStopEvent event = safetyService.getEventById(id);
        return ResponseEntity.ok(ApiResponse.success(toDTO(event)));
    }

    @GetMapping("/open")
    @Operation(summary = "Get all currently open events")
    public ResponseEntity<ApiResponse<List<EStopEventDTO>>> getOpenEvents() {
        List<EStopEventDTO> events = eventRepository.findByEventStatus(EventStatus.OPEN).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(events));
    }

    @GetMapping("/station/{stationId}")
    @Operation(summary = "Get events by station")
    public ResponseEntity<ApiResponse<List<EStopEventDTO>>> getEventsByStation(
            @PathVariable Long stationId) {
        List<EStopEventDTO> events = eventRepository.findByStation_StationId(stationId).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(events));
    }

    @PostMapping("/{id}/release")
    @Operation(summary = "Release an E-Stop event via double-press (rapid sequence)")
    public ResponseEntity<ApiResponse<EStopEventDTO>> releaseEvent(@PathVariable Long id) {
        EStopEvent event = safetyService.releaseEvent(id);
        return ResponseEntity.ok(ApiResponse.success("E-Stop released via double-press", toDTO(event)));
    }

    @GetMapping("/{id}/dispatches")
    @Operation(summary = "Get dispatch logs for an event")
    public ResponseEntity<ApiResponse<List<DispatchDTO>>> getDispatches(@PathVariable Long id) {
        List<DispatchDTO> dispatches = notificationService.getDispatchesForEvent(id).stream()
                .map(d -> DispatchDTO.builder()
                        .dispatchId(d.getDispatchId())
                        .eventId(d.getEvent().getEventId())
                        .dispatchType(d.getDispatchType().name())
                        .dispatchedAt(d.getDispatchedAt())
                        .triggerReason(d.getTriggerReason())
                        .responseStatus(d.getResponseStatus().name())
                        .notes(d.getNotes())
                        .build())
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dispatches));
    }

    private EStopEventDTO toDTO(EStopEvent event) {
        return EStopEventDTO.builder()
                .eventId(event.getEventId())
                .stationId(event.getStation().getStationId())
                .factoryId(event.getFactory().getFactoryId())
                .blockId(event.getBlockId())
                .pressedAt(event.getPressedAt())
                .eventStatus(event.getEventStatus().name())
                .severity(event.getSeverity().name())
                .isRapidSequence(event.getIsRapidSequence())
                .correlatedWorkId(event.getCorrelatedWork() != null
                        ? event.getCorrelatedWork().getWorkId() : null)
                .riskScore(event.getRiskScore())
                .stationName(event.getStation().getStationName())
                .factoryName(event.getFactory().getFactoryName())
                .workType(event.getCorrelatedWork() != null
                        ? event.getCorrelatedWork().getWorkType() : null)
                .createdAt(event.getCreatedAt())
                .build();
    }
}
