package com.example.EventManager.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ToolsStatusResponse {
    private Long eventId;
    private String eventTitle;
    private String clubName;
    private boolean toolsOpened;
    private String status;
    private LocalDate date;
    private LocalTime startTime;
    private LocalTime endTime;
    private LocalDateTime serverTime;
    private String message;
}
