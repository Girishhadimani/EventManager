package com.example.EventManager.dto;

import lombok.Data;

@Data
public class JudgeEvaluationRequest {
    private int innovationScore;    // max 20
    private int technicalScore;     // max 20
    private int uiScore;            // max 15
    private int impactScore;        // max 20
    private int presentationScore;  // max 10
    private int demoScore;          // max 15
    private String remarks;
}
