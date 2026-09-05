package com.example.EventManager.dto;

import com.example.EventManager.entity.Event;
import com.example.EventManager.entity.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ClubProfileDTO {
    private Long id;
    private String name;
    private String description;
    private String logo;
    private String category;
    private String bannerUrl;
    private String facultyCoordinatorName;
    private String facultyCoordinatorEmail;
    private List<String> studentCoordinators;
    private int totalEvents;
    private int followerCount;
    private List<Event> upcomingEvents;
    private List<Event> pastEvents;
    private List<String> achievements;
    private List<String> announcements;
    private String detailedDescription;
    private List<String> pillars;
    private String meetingSchedule;
    private String venue;
    private String eligibility;
}
