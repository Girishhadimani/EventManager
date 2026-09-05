package com.example.EventManager.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VtuActivityPointsDTO {

    private String usn;
    private String studentName;
    private String studentEmail;
    private String department;
    private String academicYear;
    private String institution;
    private String affiliation;
    private int totalPointsEarned;
    private int targetPoints;
    private double progressPercentage;
    private String status;
    private String verificationHash;
    private String generatedAt;

    @Builder.Default
    private Map<String, Integer> categoryPoints = new LinkedHashMap<>();

    @Builder.Default
    private List<ActivityItem> activities = new ArrayList<>();

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ActivityItem {
        private Long eventId;
        private String eventName;
        private String eventType;
        private String category;
        private String clubName;
        private String eventDate;
        private int activityPoints;
        private String registrationNumber;
        private String verificationCode;
        private String status;
    }
}
