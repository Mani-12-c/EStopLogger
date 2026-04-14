package com.example.demo.controller;

import com.example.demo.model.dto.ApiResponse;
import com.example.demo.model.entity.Factory;
import com.example.demo.model.entity.Station;
import com.example.demo.repository.FactoryRepository;
import com.example.demo.repository.StationRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/factories")
@Tag(name = "Factories", description = "Factory and cascading dropdown endpoints")
public class FactoryController {

    private final FactoryRepository factoryRepository;
    private final StationRepository stationRepository;

    @Autowired
    public FactoryController(FactoryRepository factoryRepository,
                             StationRepository stationRepository) {
        this.factoryRepository = factoryRepository;
        this.stationRepository = stationRepository;
    }

    @GetMapping
    @Operation(summary = "List all factories (for dropdown)")
    public ResponseEntity<ApiResponse<List<Map<String, String>>>> getAllFactories() {
        List<Map<String, String>> factories = factoryRepository.findAll().stream()
                .map(f -> {
                    Map<String, String> m = new LinkedHashMap<>();
                    m.put("factoryId", f.getFactoryId());
                    m.put("factoryName", f.getFactoryName());
                    m.put("location", f.getLocation());
                    return m;
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(factories));
    }

    @GetMapping("/{factoryId}/stations")
    @Operation(summary = "Get stations for a factory (cascading dropdown)")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getStationsByFactory(
            @PathVariable String factoryId) {
        List<Map<String, Object>> stations = stationRepository.findByFactory_FactoryId(factoryId).stream()
                .map(s -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("stationId", s.getStationId());
                    m.put("stationName", s.getStationName());
                    m.put("blockId", s.getBlockId());
                    return m;
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(stations));
    }

    @GetMapping("/{factoryId}/blocks")
    @Operation(summary = "Get distinct blocks for a factory (cascading dropdown)")
    public ResponseEntity<ApiResponse<List<String>>> getBlocksByFactory(
            @PathVariable String factoryId) {
        List<String> blocks = stationRepository.findByFactory_FactoryId(factoryId).stream()
                .map(Station::getBlockId)
                .distinct()
                .sorted()
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(blocks));
    }
}
