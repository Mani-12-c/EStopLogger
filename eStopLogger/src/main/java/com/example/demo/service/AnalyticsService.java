package com.example.demo.service;

import com.example.demo.model.dto.*;
import com.example.demo.model.entity.EStopEvent;
import com.example.demo.model.enums.EventStatus;
import com.example.demo.model.enums.Severity;
import com.example.demo.model.enums.ShiftType;
import com.example.demo.repository.AcknowledgementRepository;
import com.example.demo.repository.EStopEventRepository;
import com.example.demo.util.RiskScoreUtil;
import com.example.demo.util.ShiftUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.WeekFields;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
public class AnalyticsService {

    private final EStopEventRepository eventRepository;
    private final AcknowledgementRepository ackRepository;

    @Autowired
    public AnalyticsService(EStopEventRepository eventRepository,
                            AcknowledgementRepository ackRepository) {
        this.eventRepository = eventRepository;
        this.ackRepository = ackRepository;
    }

    /**
     * Returns a complete dashboard summary with key metrics.
     */
    public DashboardSummaryDTO getDashboardSummary(String factoryId) {
        LocalDateTime todayStart = LocalDate.now().atStartOfDay();
        LocalDateTime weekStart = todayStart.with(WeekFields.of(Locale.getDefault()).dayOfWeek(), 1);

        Long totalToday = eventRepository.countEventsSince(todayStart);
        Long totalThisWeek = eventRepository.countEventsSince(weekStart);
        Long openEvents = eventRepository.countByStatus(EventStatus.OPEN);
        Long escalatedEvents = eventRepository.countByStatus(EventStatus.ESCALATED);
        Long autoDispatchedEvents = eventRepository.countByStatus(EventStatus.AUTO_DISPATCHED);
        Long resolvedEvents = eventRepository.countByStatus(EventStatus.RESOLVED);

        // Mean ack time — use overall (not just this week) for better accuracy
        Double meanAckTime = ackRepository.findAverageAckTimeOverall();

        // Events by severity
        Map<String, Long> eventsBySeverity = new LinkedHashMap<>();
        List<Object[]> severityCounts = eventRepository.countBySeveritySince(weekStart);
        for (Object[] row : severityCounts) {
            eventsBySeverity.put(((Severity) row[0]).name(), (Long) row[1]);
        }

        // Events by shift
        List<EStopEvent> weekEvents = eventRepository.findByDateRange(weekStart, LocalDateTime.now());
        Map<String, Long> eventsByShift = weekEvents.stream()
                .collect(Collectors.groupingBy(
                        e -> ShiftUtil.getShift(e.getPressedAt()).name(),
                        Collectors.counting()));

        // Events by status
        Map<String, Long> eventsByStatus = new LinkedHashMap<>();
        eventsByStatus.put("OPEN", openEvents);
        eventsByStatus.put("ESCALATED", escalatedEvents);
        eventsByStatus.put("AUTO_DISPATCHED", autoDispatchedEvents);
        eventsByStatus.put("RESOLVED", resolvedEvents);
        eventsByStatus.put("ACKNOWLEDGED", eventRepository.countByStatus(EventStatus.ACKNOWLEDGED));

        // High risk stations — return full DTOs
        List<Object[]> stationStats = eventRepository.findStationEventStats();
        List<StationRiskDTO> highRiskStations = stationStats.stream()
                .limit(10)
                .map(row -> {
                    int avgScore = ((Double) row[3]).intValue();
                    return StationRiskDTO.builder()
                            .stationId((Long) row[0])
                            .stationName((String) row[1])
                            .eventCount((Long) row[2])
                            .riskScore(avgScore)
                            .riskLevel(RiskScoreUtil.toRiskLevel(avgScore).name())
                            .build();
                })
                .collect(Collectors.toList());

        return DashboardSummaryDTO.builder()
                .totalEventsToday(totalToday)
                .totalEventsThisWeek(totalThisWeek)
                .openEvents(openEvents)
                .escalatedEvents(escalatedEvents)
                .autoDispatchedEvents(autoDispatchedEvents)
                .resolvedEvents(resolvedEvents)
                .meanAckTimeSeconds(meanAckTime != null ? meanAckTime : 0.0)
                .eventsBySeverity(eventsBySeverity)
                .eventsByShift(eventsByShift)
                .eventsByStatus(eventsByStatus)
                .highRiskStations(highRiskStations)
                .build();
    }

    /**
     * Returns event frequency grouped by the specified groupBy parameter.
     */
    public List<FrequencyDTO> getPressFrequency(LocalDateTime from, LocalDateTime to, String groupBy) {
        List<EStopEvent> events = eventRepository.findByDateRange(from, to);

        return switch (groupBy.toLowerCase()) {
            case "hour" -> groupByHour(events);
            case "shift" -> groupByShift(events);
            case "day" -> groupByDay(events);
            case "station" -> groupByStation(events);
            default -> groupByDay(events);
        };
    }

    /**
     * Returns the mean acknowledgement time in seconds.
     */
    public Double getMeanAckTime(LocalDateTime from, LocalDateTime to, Long stationId) {
        if (stationId != null) {
            return ackRepository.findAverageAckTimeByStation(stationId, from, to);
        }
        return ackRepository.findAverageAckTime(from, to);
    }

    /**
     * Returns the stations with the highest risk scores.
     */
    public List<StationRiskDTO> getHighRiskStations(String factoryId, int limit) {
        List<Object[]> stats = eventRepository.findStationEventStats();

        return stats.stream()
                .limit(limit)
                .map(row -> {
                    int avgScore = ((Double) row[3]).intValue();
                    return StationRiskDTO.builder()
                            .stationId((Long) row[0])
                            .stationName((String) row[1])
                            .eventCount((Long) row[2])
                            .riskScore(avgScore)
                            .riskLevel(RiskScoreUtil.toRiskLevel(avgScore).name())
                            .build();
                })
                .collect(Collectors.toList());
    }

    /**
     * Returns a shift-based report for a specific date.
     */
    public ShiftReportDTO getShiftReport(LocalDate date, String factoryId) {
        LocalDateTime dayStart = date.atStartOfDay();
        LocalDateTime dayEnd = date.plusDays(1).atStartOfDay();

        List<EStopEvent> events = eventRepository.findByDateRange(dayStart, dayEnd);

        Map<String, Long> eventsByShift = new LinkedHashMap<>();
        Map<String, Long> escalationsByShift = new LinkedHashMap<>();

        for (ShiftType shift : ShiftType.values()) {
            eventsByShift.put(shift.name(), 0L);
            escalationsByShift.put(shift.name(), 0L);
        }

        for (EStopEvent event : events) {
            String shiftName = ShiftUtil.getShift(event.getPressedAt()).name();
            eventsByShift.merge(shiftName, 1L, Long::sum);
            if (event.getEventStatus() == EventStatus.ESCALATED
                    || event.getEventStatus() == EventStatus.AUTO_DISPATCHED) {
                escalationsByShift.merge(shiftName, 1L, Long::sum);
            }
        }

        // Avg ack time by shift
        Map<String, Double> avgAckTimeByShift = new LinkedHashMap<>();
        for (ShiftType shift : ShiftType.values()) {
            LocalDateTime shiftStart = ShiftUtil.getShiftStart(dayStart, shift);
            LocalDateTime shiftEnd = ShiftUtil.getShiftEnd(dayStart, shift);
            Double avgTime = ackRepository.findAverageAckTime(shiftStart, shiftEnd);
            avgAckTimeByShift.put(shift.name(), avgTime != null ? avgTime : 0.0);
        }

        return ShiftReportDTO.builder()
                .date(date.toString())
                .eventsByShift(eventsByShift)
                .escalationsByShift(escalationsByShift)
                .avgAckTimeByShift(avgAckTimeByShift)
                .build();
    }

    // ---- Helper grouping methods ----

    private List<FrequencyDTO> groupByHour(List<EStopEvent> events) {
        return events.stream()
                .collect(Collectors.groupingBy(
                        e -> String.format("%02d:00", e.getPressedAt().getHour()),
                        TreeMap::new, Collectors.counting()))
                .entrySet().stream()
                .map(e -> new FrequencyDTO(e.getKey(), e.getValue()))
                .collect(Collectors.toList());
    }

    private List<FrequencyDTO> groupByShift(List<EStopEvent> events) {
        return events.stream()
                .collect(Collectors.groupingBy(
                        e -> ShiftUtil.getShift(e.getPressedAt()).name(),
                        Collectors.counting()))
                .entrySet().stream()
                .map(e -> new FrequencyDTO(e.getKey(), e.getValue()))
                .collect(Collectors.toList());
    }

    private List<FrequencyDTO> groupByDay(List<EStopEvent> events) {
        return events.stream()
                .collect(Collectors.groupingBy(
                        e -> e.getPressedAt().toLocalDate().toString(),
                        TreeMap::new, Collectors.counting()))
                .entrySet().stream()
                .map(e -> new FrequencyDTO(e.getKey(), e.getValue()))
                .collect(Collectors.toList());
    }

    private List<FrequencyDTO> groupByStation(List<EStopEvent> events) {
        return events.stream()
                .collect(Collectors.groupingBy(
                        e -> e.getStation().getStationName(),
                        Collectors.counting()))
                .entrySet().stream()
                .map(e -> new FrequencyDTO(e.getKey(), e.getValue()))
                .collect(Collectors.toList());
    }
}
