package com.example.EventManager.dto.registration;

import com.example.EventManager.enums.EventType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RegistrationOverviewDTO {
    private Long eventId;
    private String eventTitle;
    private EventType eventType;
    private String clubName;
    private LocalDate eventDate;
    private Integer maxCapacity;
    private long totalRegistered;
    private long confirmed;
    private long waitlisted;
    private long attended;
    private double attendanceRate;
}
