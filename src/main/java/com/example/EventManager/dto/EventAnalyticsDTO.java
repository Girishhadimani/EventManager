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
public class EventAnalyticsDTO {

    private Long eventId;
    private String eventTitle;
    private String eventType;
    private String clubName;
    private int totalRegistrations;
    private int totalAttended;
    private int totalWaitlisted;
    private int totalCancelled;
    private double attendanceRate;
    private double averageRating;
    private int totalRatingsCount;

    @Builder.Default
    private Map<Integer, Integer> ratingDistribution = new LinkedHashMap<>();

    @Builder.Default
    private List<ReviewItem> reviews = new ArrayList<>();

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ReviewItem {
        private String studentName;
        private String usn;
        private String department;
        private int rating;
        private String comments;
        private String submittedAt;
    }
}
