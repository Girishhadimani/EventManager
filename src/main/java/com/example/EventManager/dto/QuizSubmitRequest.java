package com.example.EventManager.dto;

import lombok.Data;

import java.util.Map;

@Data
public class QuizSubmitRequest {
    private Long eventId;
    private Map<Integer, Integer> answers; // questionIndex -> selectedOptionIndex (0-based)
    private int timeSpentSeconds;
}
