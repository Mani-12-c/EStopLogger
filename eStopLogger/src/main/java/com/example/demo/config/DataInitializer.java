package com.example.demo.config;

import com.example.demo.model.entity.Factory;
import com.example.demo.model.entity.ScheduledWork;
import com.example.demo.model.entity.Station;
import com.example.demo.model.enums.RiskLevel;
import com.example.demo.repository.FactoryRepository;
import com.example.demo.repository.ScheduledWorkRepository;
import com.example.demo.repository.StationRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

/**
 * Seeds scheduled work data on startup with rolling time windows
 * so that event correlation always finds overlapping work.
 * Only seeds if the scheduled_work table is empty.
 */
@Slf4j
@Component
@Order(2) // Run after any other initializers
public class DataInitializer implements CommandLineRunner {

    private final ScheduledWorkRepository scheduledWorkRepository;
    private final StationRepository stationRepository;
    private final FactoryRepository factoryRepository;

    public DataInitializer(ScheduledWorkRepository scheduledWorkRepository,
                           StationRepository stationRepository,
                           FactoryRepository factoryRepository) {
        this.scheduledWorkRepository = scheduledWorkRepository;
        this.stationRepository = stationRepository;
        this.factoryRepository = factoryRepository;
    }

    @Override
    public void run(String... args) {
        if (scheduledWorkRepository.count() > 0) {
            log.info("Scheduled work already seeded ({} rows), skipping.",
                    scheduledWorkRepository.count());
            return;
        }

        List<Station> stations = stationRepository.findAll();
        List<Factory> factories = factoryRepository.findAll();

        if (stations.isEmpty() || factories.isEmpty()) {
            log.warn("No stations or factories in DB — cannot seed scheduled work.");
            return;
        }

        // Use today's date so the time windows always overlap with
        // SimulationService events (which use LocalDateTime.now()).
        LocalDate today = LocalDate.now();

        // Define work templates: (stationId, factoryId, blockId, workType,
        //   probableEmergency, instantHelp, startHour, endHour, riskLevel)
        record WorkTemplate(Long stationId, String factoryId, String blockId,
                            String workType, String probableEmergency,
                            String instantHelp, int startHour, int endHour,
                            RiskLevel riskLevel) {}

        List<WorkTemplate> templates = List.of(
                new WorkTemplate(1L, "100091", "B1", "Mechanical Maintenance",
                        "Injury/Crush", "Send Ambulance",
                        6, 18, RiskLevel.MEDIUM),
                new WorkTemplate(2L, "100091", "B1", "Welding",
                        "Fire/Burns", "Send Fire Dept/Ambulance",
                        6, 18, RiskLevel.MEDIUM),
                new WorkTemplate(3L, "100091", "B2", "Electrical",
                        "Health/Fire/Machine", "Send Ambulance/Fire Dept",
                        6, 18, RiskLevel.HIGH),
                new WorkTemplate(4L, "100092", "B1", "Chemical Handling",
                        "Toxic Exposure/Fire", "Send Hazmat/Ambulance",
                        6, 18, RiskLevel.CRITICAL),
                new WorkTemplate(5L, "100092", "B2", "Mechanical Maintenance",
                        "Injury/Crush", "Send Ambulance",
                        6, 18, RiskLevel.LOW)
        );

        int seeded = 0;
        for (WorkTemplate t : templates) {
            try {
                Station station = stationRepository.findById(t.stationId()).orElse(null);
                Factory factory = factoryRepository.findById(t.factoryId()).orElse(null);
                if (station == null || factory == null) {
                    log.warn("Skipping work seed for station={}, factory={} — not found",
                            t.stationId(), t.factoryId());
                    continue;
                }

                // Create work spanning today 06:00 to 18:00 (12-hour shift)
                ScheduledWork work = ScheduledWork.builder()
                        .station(station)
                        .factory(factory)
                        .blockId(t.blockId())
                        .workType(t.workType())
                        .probableEmergency(t.probableEmergency())
                        .instantHelp(t.instantHelp())
                        .startTime(LocalDateTime.of(today, LocalTime.of(t.startHour(), 0)))
                        .endTime(LocalDateTime.of(today, LocalTime.of(t.endHour(), 0)))
                        .riskLevel(t.riskLevel())
                        .build();

                scheduledWorkRepository.save(work);
                seeded++;
            } catch (Exception e) {
                log.error("Failed to seed work for station {}: {}", t.stationId(), e.getMessage());
            }
        }

        log.info("DataInitializer: seeded {} scheduled work entries for {}", seeded, today);
    }
}
