package com.example.demo.controller;

import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.model.dto.ApiResponse;
import com.example.demo.model.dto.StationStatusDTO;
import com.example.demo.model.entity.Station;
import com.example.demo.model.enums.EventStatus;
import com.example.demo.repository.EStopEventRepository;
import com.example.demo.repository.StationRepository;
import com.example.demo.service.HmiService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/stations")
@Tag(name = "Stations", description = "Station management and HMI status")
public class StationController {

    private final StationRepository stationRepository;
    private final EStopEventRepository eventRepository;
    private final HmiService hmiService;

    @Autowired
    public StationController(StationRepository stationRepository,
                             EStopEventRepository eventRepository,
                             HmiService hmiService) {
        this.stationRepository = stationRepository;
        this.eventRepository = eventRepository;
        this.hmiService = hmiService;
    }

    @GetMapping
    @Operation(summary = "List all stations with HMI states")
    public ResponseEntity<ApiResponse<List<StationStatusDTO>>> getAllStations() {
        List<StationStatusDTO> stations = stationRepository.findAll().stream()
                .map(this::toStatusDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(stations));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get single station details")
    public ResponseEntity<ApiResponse<StationStatusDTO>> getStation(@PathVariable Long id) {
        Station station = stationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Station", "id", id));
        return ResponseEntity.ok(ApiResponse.success(toStatusDTO(station)));
    }

    @GetMapping("/{id}/status")
    @Operation(summary = "Get current HMI state for a station")
    public ResponseEntity<ApiResponse<String>> getStationHmiStatus(@PathVariable Long id) {
        Station station = stationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Station", "id", id));
        return ResponseEntity.ok(ApiResponse.success(station.getCurrentHmiState().name()));
    }

    @GetMapping("/factory/{factoryId}")
    @Operation(summary = "Get stations by factory")
    public ResponseEntity<ApiResponse<List<StationStatusDTO>>> getStationsByFactory(
            @PathVariable String factoryId) {
        List<StationStatusDTO> stations = stationRepository.findByFactory_FactoryId(factoryId).stream()
                .map(this::toStatusDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(stations));
    }

    private StationStatusDTO toStatusDTO(Station station) {
        Long openCount = eventRepository.countActiveByStation(
                station.getStationId(),
                List.of(EventStatus.OPEN, EventStatus.ESCALATED, EventStatus.CRITICAL));

        return StationStatusDTO.builder()
                .stationId(station.getStationId())
                .stationName(station.getStationName())
                .factoryId(station.getFactory().getFactoryId())
                .factoryName(station.getFactory().getFactoryName())
                .blockId(station.getBlockId())
                .status(station.getStatus().name())
                .currentHmiState(station.getCurrentHmiState().name())
                .openEventCount(openCount)
                .build();
    }
}
