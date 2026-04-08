package com.example.demo.model.dto;

import lombok.*;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class LoginResponseDTO {

    private String token;
    private String role;
    private Long userId;
    private String username;
    private String fullName;
    private Long assignedStationId;
    private String shift;
}
