package com.example.demo.controller;

import com.example.demo.model.dto.ApiResponse;
import com.example.demo.model.dto.DatasetStatusDTO;
import com.example.demo.service.DatasetIngestionService;
import com.example.demo.service.SimulationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/datasets")
@Tag(name = "Datasets", description = "CSV dataset ingestion and simulation")
public class DatasetController {

    private final DatasetIngestionService ingestionService;
    private final SimulationService simulationService;

    @Autowired
    public DatasetController(DatasetIngestionService ingestionService,
                             SimulationService simulationService) {
        this.ingestionService = ingestionService;
        this.simulationService = simulationService;
    }

    @PostMapping("/upload")
    @Operation(summary = "Upload a CSV dataset by type (factories, stations, scheduled_work, estop_events, users, acknowledgements)")
    public ResponseEntity<ApiResponse<DatasetStatusDTO>> uploadDataset(
            @RequestParam("file") MultipartFile file,
            @RequestParam("type") String type) {

        DatasetStatusDTO result = switch (type.toLowerCase()) {
            case "factories" -> ingestionService.ingestFactories(file);
            case "stations" -> ingestionService.ingestStations(file);
            case "scheduled_work" -> ingestionService.ingestScheduledWork(file);
            case "estop_events" -> ingestionService.ingestEStopEvents(file);
            case "users" -> ingestionService.ingestUsers(file);
            case "acknowledgements" -> ingestionService.ingestAcknowledgements(file);
            default -> throw new IllegalArgumentException(
                    "Unknown dataset type: " + type +
                    ". Supported: factories, stations, scheduled_work, estop_events, users, acknowledgements");
        };

        return ResponseEntity.ok(ApiResponse.success("Dataset ingested", result));
    }

    @PostMapping("/simulate")
    @Operation(summary = "Auto-generate random E-Stop events for testing")
    public ResponseEntity<ApiResponse<Integer>> simulate(
            @RequestParam(defaultValue = "10") int count) {
        int generated = simulationService.simulateEvents(count);
        return ResponseEntity.ok(ApiResponse.success("Simulation completed", generated));
    }

    @GetMapping("/status")
    @Operation(summary = "Get the status of the last ingestion operation")
    public ResponseEntity<ApiResponse<DatasetStatusDTO>> getStatus() {
        DatasetStatusDTO status = ingestionService.getLastIngestionStatus();
        return ResponseEntity.ok(ApiResponse.success(status));
    }

    @GetMapping("/templates")
    @Operation(summary = "Get CSV template headers for each dataset type")
    public ResponseEntity<ApiResponse<java.util.Map<String, String>>> getTemplates() {
        var templates = java.util.Map.of(
                "factories", "factory_id,factory_name,location",
                "stations", "station_id,factory_id,block_id,station_name,status",
                "scheduled_work", "work_id,station_id,factory_id,block_id,work_type,probable_emergency,instant_help,start_time,end_time,risk_level",
                "estop_events", "event_id,station_id,factory_id,block_id,pressed_at",
                "users", "user_id,username,password,full_name,role,assigned_station_id,shift",
                "acknowledgements", "ack_id,event_id,user_id,acknowledged_at,resolution_category,custom_resolution_text"
        );
        return ResponseEntity.ok(ApiResponse.success(templates));
    }
}
