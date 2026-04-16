package com.example.demo.controller;

import com.example.demo.model.dto.*;
import com.example.demo.service.AnalyticsService;
import com.example.demo.repository.EStopEventRepository;
import com.example.demo.repository.RiskScoreHistoryRepository;
import com.example.demo.model.entity.RiskScoreHistory;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.WeekFields;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/analytics")
@Tag(name = "Analytics", description = "Dashboard metrics and analytics")
public class AnalyticsController {

    private final AnalyticsService analyticsService;
    private final RiskScoreHistoryRepository riskScoreHistoryRepository;
    private final EStopEventRepository eventRepository;

    @Autowired
    public AnalyticsController(AnalyticsService analyticsService,
                               RiskScoreHistoryRepository riskScoreHistoryRepository,
                               EStopEventRepository eventRepository) {
        this.analyticsService = analyticsService;
        this.riskScoreHistoryRepository = riskScoreHistoryRepository;
        this.eventRepository = eventRepository;
    }

    @GetMapping("/summary")
    @Operation(summary = "Get dashboard summary with key metrics")
    public ResponseEntity<ApiResponse<DashboardSummaryDTO>> getSummary(
            @RequestParam(required = false) String factoryId) {
        DashboardSummaryDTO summary = analyticsService.getDashboardSummary(factoryId);
        return ResponseEntity.ok(ApiResponse.success(summary));
    }

    @GetMapping("/press-frequency")
    @Operation(summary = "Get event frequency grouped by hour/shift/day/station")
    public ResponseEntity<ApiResponse<List<FrequencyDTO>>> getPressFrequency(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @RequestParam(defaultValue = "day") String groupBy) {
        List<FrequencyDTO> data = analyticsService.getPressFrequency(from, to, groupBy);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @GetMapping("/mean-ack-time")
    @Operation(summary = "Get mean acknowledgement time in seconds")
    public ResponseEntity<ApiResponse<Double>> getMeanAckTime(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @RequestParam(required = false) Long stationId) {
        Double meanTime = analyticsService.getMeanAckTime(from, to, stationId);
        return ResponseEntity.ok(ApiResponse.success(meanTime != null ? meanTime : 0.0));
    }

    @GetMapping("/high-risk-stations")
    @Operation(summary = "Get stations with highest risk scores")
    public ResponseEntity<ApiResponse<List<StationRiskDTO>>> getHighRiskStations(
            @RequestParam(required = false) String factoryId,
            @RequestParam(defaultValue = "10") int limit) {
        List<StationRiskDTO> stations = analyticsService.getHighRiskStations(factoryId, limit);
        return ResponseEntity.ok(ApiResponse.success(stations));
    }

    @GetMapping("/shift-report")
    @Operation(summary = "Get shift-based event report for a date")
    public ResponseEntity<ApiResponse<ShiftReportDTO>> getShiftReport(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) String factoryId) {
        ShiftReportDTO report = analyticsService.getShiftReport(date, factoryId);
        return ResponseEntity.ok(ApiResponse.success(report));
    }

    @GetMapping("/trend")
    @Operation(summary = "Get risk score trend for a station over weeks")
    public ResponseEntity<ApiResponse<List<FrequencyDTO>>> getRiskTrend(
            @RequestParam Long stationId,
            @RequestParam(defaultValue = "12") int weeks) {

        LocalDateTime since = LocalDate.now().minusWeeks(weeks).atStartOfDay();

        // Aggregate directly from estop_event: AVG(risk_score) grouped by week
        List<FrequencyDTO> trend = eventRepository
                .findWeeklyRiskTrendByStation(stationId, since).stream()
                .map(row -> new FrequencyDTO(
                        (String) row[0],                          // week label e.g. "W15 Apr 07"
                        ((Number) row[1]).longValue()))            // avg risk score
                .collect(Collectors.toList());

        // Fallback: if no event-based data, try the pre-computed history table
        if (trend.isEmpty()) {
            int currentWeek = LocalDate.now().get(WeekFields.of(Locale.getDefault()).weekOfYear());
            int fromWeek = currentWeek - weeks;
            trend = riskScoreHistoryRepository
                    .findByStationAndWeekRange(stationId, fromWeek).stream()
                    .map(r -> new FrequencyDTO("Week " + r.getWeekNumber(), (long) r.getRiskScore()))
                    .collect(Collectors.toList());
        }

        return ResponseEntity.ok(ApiResponse.success(trend));
    }
}
