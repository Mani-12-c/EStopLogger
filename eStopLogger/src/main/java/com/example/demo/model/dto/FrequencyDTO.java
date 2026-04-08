package com.example.demo.model.dto;

import lombok.*;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class FrequencyDTO {

    private String label;
    private Long count;
}
