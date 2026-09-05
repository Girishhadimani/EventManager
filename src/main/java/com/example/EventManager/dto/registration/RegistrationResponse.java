package com.example.EventManager.dto.registration;

import com.example.EventManager.enums.EventType;
import com.example.EventManager.enums.RegistrationStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RegistrationResponse {
    private Long id;
    private String registrationNumber;
    private Long eventId;
    private String eventTitle;
    private EventType eventType;
    private String clubName;
    private LocalDate eventDate;
    private LocalTime eventTime;
    private String eventVenue;

    private Long userId;
    private String studentName;
    private String studentEmail;
    private String phone;
    private String usnOrStudentId;
    private String department;
    private String year;

    private RegistrationStatus status;
    private LocalDateTime registeredAt;
    private LocalDateTime checkedInAt;

    private String customData;
    private String qrCodeData;

    // Team details
    private String teamName;
    private String teamMembers;
    private Boolean isTeamLead;

    // Feedback & Rating
    private Integer feedbackRating;
    private String feedbackComments;

    // VTU Activity Points
    private Integer activityPointsEarned;
}
