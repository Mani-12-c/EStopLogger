package com.example.demo.service;

import com.example.demo.model.dto.DatasetStatusDTO;
import com.example.demo.model.dto.EStopEventDTO;
import com.example.demo.model.entity.*;
import com.example.demo.model.enums.*;
import com.example.demo.repository.*;
import com.example.demo.util.CsvParserUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
public class DatasetIngestionService {

    private final FactoryRepository factoryRepository;
    private final StationRepository stationRepository;
    private final ScheduledWorkRepository scheduledWorkRepository;
    private final UserRepository userRepository;
    private final AcknowledgementRepository ackRepository;
    private final EStopEventRepository eventRepository;
    private final SafetyService safetyService;
    private final AcknowledgementService acknowledgementService;
    private final PasswordEncoder passwordEncoder;

    @Autowired
    public DatasetIngestionService(FactoryRepository factoryRepository,
                                   StationRepository stationRepository,
                                   ScheduledWorkRepository scheduledWorkRepository,
                                   UserRepository userRepository,
                                   AcknowledgementRepository ackRepository,
                                   EStopEventRepository eventRepository,
                                   SafetyService safetyService,
                                   AcknowledgementService acknowledgementService,
                                   PasswordEncoder passwordEncoder) {
        this.factoryRepository = factoryRepository;
        this.stationRepository = stationRepository;
        this.scheduledWorkRepository = scheduledWorkRepository;
        this.userRepository = userRepository;
        this.ackRepository = ackRepository;
        this.eventRepository = eventRepository;
        this.safetyService = safetyService;
        this.acknowledgementService = acknowledgementService;
        this.passwordEncoder = passwordEncoder;
    }

    private static final DateTimeFormatter DT_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm[:ss]");

    private DatasetStatusDTO lastStatus;

    /**
     * Ingests factory data from CSV.
     */
    public DatasetStatusDTO ingestFactories(MultipartFile file) {
        List<String> errors = new ArrayList<>();
        int success = 0;

        try {
            List<String[]> rows = CsvParserUtil.parseCsvSkipHeader(file);

            for (int i = 0; i < rows.size(); i++) {
                try {
                    String[] row = rows.get(i);
                    Factory factory = Factory.builder()
                            .factoryId(CsvParserUtil.getSafe(row, 0))
                            .factoryName(CsvParserUtil.getSafe(row, 1))
                            .location(CsvParserUtil.getSafe(row, 2))
                            .build();
                    factoryRepository.save(factory);
                    success++;
                } catch (Exception e) {
                    errors.add("Row " + (i + 2) + ": " + e.getMessage());
                }
            }

            lastStatus = buildStatus("COMPLETED", rows.size(), success, errors);
        } catch (Exception e) {
            lastStatus = buildStatus("FAILED", 0, 0, List.of(e.getMessage()));
        }

        log.info("Factory ingestion: {} success, {} errors", success, errors.size());
        return lastStatus;
    }

    /**
     * Ingests station data from CSV.
     */
    public DatasetStatusDTO ingestStations(MultipartFile file) {
        List<String> errors = new ArrayList<>();
        int success = 0;

        try {
            List<String[]> rows = CsvParserUtil.parseCsvSkipHeader(file);

            for (int i = 0; i < rows.size(); i++) {
                try {
                    String[] row = rows.get(i);
                    Factory factory = factoryRepository.findById(CsvParserUtil.getSafe(row, 1))
                            .orElseThrow(() -> new RuntimeException("Factory not found: " + row[1]));

                    Station station = Station.builder()
                            .factory(factory)
                            .blockId(CsvParserUtil.getSafe(row, 2))
                            .stationName(CsvParserUtil.getSafe(row, 3))
                            .status(StationStatus.valueOf(CsvParserUtil.getSafe(row, 4)))
                            .currentHmiState(HmiState.GREEN)
                            .build();
                    stationRepository.save(station);
                    success++;
                } catch (Exception e) {
                    errors.add("Row " + (i + 2) + ": " + e.getMessage());
                }
            }

            lastStatus = buildStatus("COMPLETED", rows.size(), success, errors);
        } catch (Exception e) {
            lastStatus = buildStatus("FAILED", 0, 0, List.of(e.getMessage()));
        }

        log.info("Station ingestion: {} success, {} errors", success, errors.size());
        return lastStatus;
    }

    /**
     * Ingests scheduled work data from CSV.
     */
    public DatasetStatusDTO ingestScheduledWork(MultipartFile file) {
        List<String> errors = new ArrayList<>();
        int success = 0;

        try {
            List<String[]> rows = CsvParserUtil.parseCsvSkipHeader(file);

            for (int i = 0; i < rows.size(); i++) {
                try {
                    String[] row = rows.get(i);
                    Station station = stationRepository.findById(Long.parseLong(CsvParserUtil.getSafe(row, 1)))
                            .orElseThrow(() -> new RuntimeException("Station not found: " + row[1]));
                    Factory factory = factoryRepository.findById(CsvParserUtil.getSafe(row, 2))
                            .orElseThrow(() -> new RuntimeException("Factory not found: " + row[2]));

                    ScheduledWork work = ScheduledWork.builder()
                            .station(station)
                            .factory(factory)
                            .blockId(CsvParserUtil.getSafe(row, 3))
                            .workType(CsvParserUtil.getSafe(row, 4))
                            .probableEmergency(CsvParserUtil.getSafe(row, 5))
                            .instantHelp(CsvParserUtil.getSafe(row, 6))
                            .startTime(LocalDateTime.parse(CsvParserUtil.getSafe(row, 7), DT_FORMAT))
                            .endTime(LocalDateTime.parse(CsvParserUtil.getSafe(row, 8), DT_FORMAT))
                            .riskLevel(RiskLevel.valueOf(CsvParserUtil.getSafe(row, 9)))
                            .build();
                    scheduledWorkRepository.save(work);
                    success++;
                } catch (Exception e) {
                    errors.add("Row " + (i + 2) + ": " + e.getMessage());
                }
            }

            lastStatus = buildStatus("COMPLETED", rows.size(), success, errors);
        } catch (Exception e) {
            lastStatus = buildStatus("FAILED", 0, 0, List.of(e.getMessage()));
        }

        log.info("ScheduledWork ingestion: {} success, {} errors", success, errors.size());
        return lastStatus;
    }

    /**
     * Ingests E-Stop events from CSV. Each event goes through the full safety workflow.
     */
    public DatasetStatusDTO ingestEStopEvents(MultipartFile file) {
        List<String> errors = new ArrayList<>();
        int success = 0;

        try {
            List<String[]> rows = CsvParserUtil.parseCsvSkipHeader(file);

            for (int i = 0; i < rows.size(); i++) {
                try {
                    String[] row = rows.get(i);
                    EStopEventDTO dto = EStopEventDTO.builder()
                            .stationId(Long.parseLong(CsvParserUtil.getSafe(row, 1)))
                            .factoryId(CsvParserUtil.getSafe(row, 2))
                            .blockId(CsvParserUtil.getSafe(row, 3))
                            .pressedAt(LocalDateTime.parse(CsvParserUtil.getSafe(row, 4), DT_FORMAT))
                            .build();

                    safetyService.processNewEvent(dto);
                    success++;
                } catch (Exception e) {
                    errors.add("Row " + (i + 2) + ": " + e.getMessage());
                }
            }

            lastStatus = buildStatus("COMPLETED", rows.size(), success, errors);
        } catch (Exception e) {
            lastStatus = buildStatus("FAILED", 0, 0, List.of(e.getMessage()));
        }

        log.info("EStopEvent ingestion: {} success, {} errors", success, errors.size());
        return lastStatus;
    }

    /**
     * Ingests user data from CSV.
     */
    public DatasetStatusDTO ingestUsers(MultipartFile file) {
        List<String> errors = new ArrayList<>();
        int success = 0;

        try {
            List<String[]> rows = CsvParserUtil.parseCsvSkipHeader(file);

            for (int i = 0; i < rows.size(); i++) {
                try {
                    String[] row = rows.get(i);
                    Station assignedStation = null;
                    String stationIdStr = CsvParserUtil.getSafe(row, 5);
                    if (stationIdStr != null) {
                        assignedStation = stationRepository.findById(Long.parseLong(stationIdStr))
                                .orElse(null);
                    }

                    AppUser user = AppUser.builder()
                            .username(CsvParserUtil.getSafe(row, 1))
                            .password(passwordEncoder.encode(CsvParserUtil.getSafe(row, 2)))
                            .fullName(CsvParserUtil.getSafe(row, 3))
                            .role(UserRole.valueOf(CsvParserUtil.getSafe(row, 4)))
                            .assignedStation(assignedStation)
                            .shift(CsvParserUtil.getSafe(row, 6) != null
                                    ? ShiftType.valueOf(CsvParserUtil.getSafe(row, 6)) : null)
                            .build();
                    userRepository.save(user);
                    success++;
                } catch (Exception e) {
                    errors.add("Row " + (i + 2) + ": " + e.getMessage());
                }
            }

            lastStatus = buildStatus("COMPLETED", rows.size(), success, errors);
        } catch (Exception e) {
            lastStatus = buildStatus("FAILED", 0, 0, List.of(e.getMessage()));
        }

        log.info("User ingestion: {} success, {} errors", success, errors.size());
        return lastStatus;
    }

    /**
     * Ingests acknowledgement data from CSV.
     */
    public DatasetStatusDTO ingestAcknowledgements(MultipartFile file) {
        List<String> errors = new ArrayList<>();
        int success = 0;

        try {
            List<String[]> rows = CsvParserUtil.parseCsvSkipHeader(file);

            for (int i = 0; i < rows.size(); i++) {
                try {
                    String[] row = rows.get(i);
                    Long eventId = Long.parseLong(CsvParserUtil.getSafe(row, 1));
                    Long userId = Long.parseLong(CsvParserUtil.getSafe(row, 2));
                    LocalDateTime ackedAt = LocalDateTime.parse(CsvParserUtil.getSafe(row, 3), DT_FORMAT);
                    ResolutionCategory category = ResolutionCategory.valueOf(CsvParserUtil.getSafe(row, 4));
                    String customText = CsvParserUtil.getSafe(row, 5);

                    EStopEvent event = eventRepository.findById(eventId)
                            .orElseThrow(() -> new RuntimeException("Event not found: " + eventId));
                    AppUser user = userRepository.findById(userId)
                            .orElseThrow(() -> new RuntimeException("User not found: " + userId));

                    boolean withinThreshold = java.time.Duration.between(
                            event.getPressedAt(), ackedAt).getSeconds() <= 120;

                    Acknowledgement ack = Acknowledgement.builder()
                            .event(event)
                            .user(user)
                            .acknowledgedAt(ackedAt)
                            .resolutionCategory(category)
                            .customResolutionText(customText)
                            .ackWithinThreshold(withinThreshold)
                            .build();
                    ackRepository.save(ack);

                    event.setEventStatus(EventStatus.RESOLVED);
                    eventRepository.save(event);

                    success++;
                } catch (Exception e) {
                    errors.add("Row " + (i + 2) + ": " + e.getMessage());
                }
            }

            lastStatus = buildStatus("COMPLETED", rows.size(), success, errors);
        } catch (Exception e) {
            lastStatus = buildStatus("FAILED", 0, 0, List.of(e.getMessage()));
        }

        log.info("Acknowledgement ingestion: {} success, {} errors", success, errors.size());
        return lastStatus;
    }

    /**
     * Returns the status of the last ingestion operation.
     */
    public DatasetStatusDTO getLastIngestionStatus() {
        if (lastStatus == null) {
            return DatasetStatusDTO.builder()
                    .status("NO_INGESTION")
                    .message("No dataset has been ingested yet")
                    .build();
        }
        return lastStatus;
    }

    private DatasetStatusDTO buildStatus(String status, int total, int success, List<String> errors) {
        return DatasetStatusDTO.builder()
                .status(status)
                .message(String.format("Processed %d/%d rows successfully", success, total))
                .totalRows(total)
                .successRows(success)
                .failedRows(total - success)
                .errors(errors)
                .build();
    }
}
