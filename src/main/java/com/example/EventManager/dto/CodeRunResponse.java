package com.example.EventManager.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CodeRunResponse {
    private String status;         // "ACCEPTED", "WRONG_ANSWER", "RUNTIME_ERROR", "COMPILATION_ERROR"
    private String output;
    private long executionTimeMs;
    private int testsPassed;
    private int totalTests;
    private int score;             // e.g. 100
    private String feedback;
    private List<TestCaseResult> testCaseResults;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TestCaseResult {
        private String testName;
        private String input;
        private String expectedOutput;
        private String actualOutput;
        private boolean passed;
    }
}
