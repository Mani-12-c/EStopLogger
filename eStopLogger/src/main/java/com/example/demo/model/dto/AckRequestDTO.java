package com.example.demo.model.dto;

import com.example.demo.model.enums.ResolutionCategory;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class AckRequestDTO {

    @NotNull(message = "Resolution category is required")
    private ResolutionCategory resolutionCategory;

    private String customResolutionText;
}
