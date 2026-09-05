package com.example.EventManager.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ClubRequest {

    @NotBlank(message = "Club name is required")
    private String name;

    private String description;

    private String logo; // URL or emoji icon

    // ── Extended club profile fields ─────────────────────────────────────────
    private String category;               // e.g. "Technical & Innovation"

    private String detailedDescription;    // Long mission / vision paragraph

    private String bannerUrl;              // Hero banner image URL

    private String facultyCoordinatorName;

    private String facultyCoordinatorEmail;

    private String studentCoordinatorName;

    private String studentCoordinatorEmail;

    private String meetingSchedule;        // e.g. "Every Wednesday, 5:00 PM – 6:30 PM"

    private String venue;                  // Regular meeting venue / lab

    private String eligibility;            // Membership eligibility criteria
    // ─────────────────────────────────────────────────────────────────────────
}
