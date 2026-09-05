package com.example.EventManager.dto;

import lombok.Data;
import java.time.LocalDate;
import java.time.LocalTime;

@Data
public class ConflictCheckRequest {
    private LocalDate date;
    private LocalTime startTime;
    private LocalTime endTime;
    private String venue;
    private Long excludeEventId;
}
