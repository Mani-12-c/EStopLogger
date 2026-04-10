package com.example.demo.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import com.example.demo.model.dto.AckRequestDTO;
import com.example.demo.model.dto.AckResponseDTO;
import com.example.demo.model.dto.ApiResponse;
import com.example.demo.service.AcknowledgementService;

@RestController
@RequestMapping("/api/acknowledgements")
@Tag(name = "Acknowledgements", description = "E-Stop acknowledgement workflow")
public class AcknowledgementController {

    private final AcknowledgementService acknowledgementService;

    @Autowired
    public AcknowledgementController(AcknowledgementService acknowledgementService) {
        this.acknowledgementService = acknowledgementService;
    }

    @PostMapping("/{eventId}/acknowledge")
    @Operation(summary = "Acknowledge an E-Stop event")
    public ResponseEntity<ApiResponse<AckResponseDTO>> acknowledgeEvent(
            @PathVariable Long eventId,
            @Valid @RequestBody AckRequestDTO request,
            Authentication authentication) {

        String username = authentication.getName();
        AckResponseDTO response = acknowledgementService.acknowledgeEvent(eventId, request, username);
        return ResponseEntity.ok(ApiResponse.success("Event acknowledged", response));
    }

    @PostMapping("/{eventId}/resolve")
    @Operation(summary = "Resolve (close ticket) an acknowledged E-Stop event")
    public ResponseEntity<ApiResponse<String>> resolveEvent(
            @PathVariable Long eventId,
            Authentication authentication) {

        String username = authentication.getName();
        acknowledgementService.resolveEvent(eventId, username);
        return ResponseEntity.ok(ApiResponse.success("Event resolved - ticket closed", null));
    }
}
