package com.example.demo.model.dto;

import lombok.*;
import java.util.List;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class DatasetStatusDTO {

    private String status;
    private String message;
    private Integer totalRows;
    private Integer successRows;
    private Integer failedRows;
    private List<String> errors;
}
