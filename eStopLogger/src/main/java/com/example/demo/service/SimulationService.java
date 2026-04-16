package com.example.demo.service;

import com.example.demo.model.dto.EStopEventDTO;
import com.example.demo.model.entity.Factory;
import com.example.demo.model.entity.Station;
import com.example.demo.repository.FactoryRepository;
import com.example.demo.repository.StationRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Random;

@Slf4j
@Service
public class SimulationService {

    private final StationRepository stationRepository;
    private final FactoryRepository factoryRepository;
    private final SafetyService safetyService;
    private final Random random = new Random();

    @Autowired
    public SimulationService(StationRepository stationRepository,
                             FactoryRepository factoryRepository,
                             SafetyService safetyService) {
        this.stationRepository = stationRepository;
        this.factoryRepository = factoryRepository;
        this.safetyService = safetyService;
    }

    /**
     * Generates a specified number of random E-Stop events across existing stations.
     * Can simulate normal presses, rapid sequences, and shift-distributed events.
     */
    public int simulateEvents(int count) {
        List<Station> stations = stationRepository.findAll();
        List<Factory> factories = factoryRepository.findAll();

        if (stations.isEmpty() || factories.isEmpty()) {
            log.warn("Cannot simulate: no stations or factories in database");
            return 0;
        }

        int generated = 0;
        LocalDateTime baseTime = LocalDateTime.now();

        for (int i = 0; i < count; i++) {
            try {
                Station station = stations.get(random.nextInt(stations.size()));

                // Generate events within today's working hours (06:00–18:00)
                // so they overlap with seeded scheduled work
                int hourOffset = random.nextInt(12); // 0-11 hours after 06:00
                int minuteOffset = random.nextInt(60);
                LocalDateTime pressedAt = baseTime.toLocalDate()
                        .atTime(6 + hourOffset, minuteOffset);

                EStopEventDTO dto = EStopEventDTO.builder()
                        .stationId(station.getStationId())
                        .factoryId(station.getFactory().getFactoryId())
                        .blockId(station.getBlockId())
                        .pressedAt(pressedAt)
                        .build();

                safetyService.processNewEvent(dto);
                generated++;

                // Simulate rapid sequence with 15% probability
                if (random.nextDouble() < 0.15) {
                    EStopEventDTO rapidDto = EStopEventDTO.builder()
                            .stationId(station.getStationId())
                            .factoryId(station.getFactory().getFactoryId())
                            .blockId(station.getBlockId())
                            .pressedAt(pressedAt.plusSeconds(random.nextInt(4) + 1))
                            .build();
                    safetyService.processNewEvent(rapidDto);
                    generated++;
                }
            } catch (Exception e) {
                log.error("Simulation error at event {}: {}", i, e.getMessage());
            }
        }

        log.info("Simulation completed: {} events generated from {} requested", generated, count);
        return generated;
    }
}
