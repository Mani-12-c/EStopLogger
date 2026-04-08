package com.example.demo.controller;

import com.example.demo.model.dto.ApiResponse;
import com.example.demo.model.dto.AuditLogDTO;
import com.example.demo.model.dto.EventTimelineDTO;
import com.example.demo.service.AuditService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/audit")
@Tag(name = "Audit", description = "Audit trail and compliance exports")
public class AuditController {

    private final AuditService auditService;

    @Autowired
    public AuditController(AuditService auditService) {
        this.auditService = auditService;
    }

    @GetMapping("/logs")
    @Operation(summary = "Get paginated, filtered audit logs")
    public ResponseEntity<ApiResponse<Page<AuditLogDTO>>> getAuditLogs(
            @RequestParam(required = false) Long eventId,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) Long performedBy,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Page<AuditLogDTO> logs = auditService.getAuditLogs(
                eventId, action, performedBy, from, to,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "timestamp")));

        return ResponseEntity.ok(ApiResponse.success(logs));
    }

    @GetMapping("/export")
    @Operation(summary = "Export audit logs as CSV")
    public ResponseEntity<byte[]> exportAuditLogs(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) {

        byte[] csvData = auditService.exportAuditReportCsv(from, to);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=audit_report.csv")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csvData);
    }

    @GetMapping("/event/{eventId}/timeline")
    @Operation(summary = "Get the full timeline for an event")
    public ResponseEntity<ApiResponse<EventTimelineDTO>> getEventTimeline(
            @PathVariable Long eventId) {
        EventTimelineDTO timeline = auditService.getEventTimeline(eventId);
        return ResponseEntity.ok(ApiResponse.success(timeline));
    }
}
