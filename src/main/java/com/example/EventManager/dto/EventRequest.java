package com.example.EventManager.dto;

import com.example.EventManager.enums.EventType;
import com.example.EventManager.enums.ToolType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Set;

@Data
public class EventRequest {

    @NotBlank(message = "Title is required")
    private String title;

    private String description;

    @NotNull(message = "Date is required")
    private LocalDate date;

    private LocalTime time;

    private LocalTime startTime;

    private LocalTime endTime;

    private String venue;

    private Long clubId;

    private EventType eventType;

    private Set<ToolType> tools;

    private String toolConfig;

    private Integer maxParticipants;

    private LocalDate registrationDeadline;

    private String registrationFormSchema;

    private com.example.EventManager.enums.EventStatus status;
}

