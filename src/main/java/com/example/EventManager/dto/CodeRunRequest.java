package com.example.EventManager.dto;

import lombok.Data;

@Data
public class CodeRunRequest {
    private Long eventId;
    private String language; // "python", "javascript", "java", "cpp"
    private String code;
    private String customInput;
    private boolean isSubmission; // false = test run, true = final submit
}
