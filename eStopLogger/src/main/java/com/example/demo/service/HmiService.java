package com.example.demo.service;

import com.example.demo.model.entity.Station;
import com.example.demo.model.enums.EventStatus;
import com.example.demo.model.enums.HmiState;
import com.example.demo.repository.EStopEventRepository;
import com.example.demo.repository.StationRepository;
import com.example.demo.exception.ResourceNotFoundException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
public class HmiService {

    private final StationRepository stationRepository;
    private final EStopEventRepository eventRepository;

    @Autowired
    public HmiService(StationRepository stationRepository, EStopEventRepository eventRepository) {
        this.stationRepository = stationRepository;
        this.eventRepository = eventRepository;
    }

    /**
     * Calculates the current HMI state for a station based on active events.
     *   RED   — Any OPEN, ESCALATED, CRITICAL, or AUTO_DISPATCHED event
     *   AMBER — Any ACKNOWLEDGED but not RESOLVED event
     *   GREEN — All events resolved (or no events)
     */
    public HmiState calculateHmiState(Long stationId) {
        List<EventStatus> redStatuses = List.of(
                EventStatus.OPEN, EventStatus.ESCALATED,
                EventStatus.CRITICAL, EventStatus.AUTO_DISPATCHED);

        Long redCount = eventRepository.countActiveByStation(stationId, redStatuses);
        if (redCount > 0) return HmiState.RED;

        Long amberCount = eventRepository.countActiveByStation(stationId,
                List.of(EventStatus.ACKNOWLEDGED));
        if (amberCount > 0) return HmiState.AMBER;

        return HmiState.GREEN;
    }

    /**
     * Updates the HMI state of a station in the database.
     */
    @Transactional
    public void updateState(Long stationId, HmiState state) {
        Station station = stationRepository.findById(stationId)
                .orElseThrow(() -> new ResourceNotFoundException("Station", "id", stationId));

        station.setCurrentHmiState(state);
        stationRepository.save(station);

        log.info("HMI state updated: Station {} → {}", stationId, state);
    }

    /**
     * Recalculates and updates the HMI state for a station based on current events.
     */
    @Transactional
    public HmiState refreshHmiState(Long stationId) {
        HmiState newState = calculateHmiState(stationId);
        updateState(stationId, newState);
        return newState;
    }
}
