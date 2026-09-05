package com.example.EventManager.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "clubs")
public class Club {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String logo; // URL or emoji icon or file path

    // ── Extended club profile fields ─────────────────────────────────────────
    private String category; // e.g. "Technical & Innovation", "Cultural & Performing Arts"

    @Column(name = "detailed_description", columnDefinition = "TEXT")
    private String detailedDescription; // Long mission/vision text

    @Column(name = "banner_url")
    private String bannerUrl; // Hero banner image URL

    @Column(name = "faculty_coordinator_name")
    private String facultyCoordinatorName;

    @Column(name = "faculty_coordinator_email")
    private String facultyCoordinatorEmail;

    @Column(name = "student_coordinator_name")
    private String studentCoordinatorName;

    @Column(name = "student_coordinator_email")
    private String studentCoordinatorEmail;

    @Column(name = "meeting_schedule")
    private String meetingSchedule; // e.g. "Every Wednesday, 5:00 PM - 6:30 PM"

    private String venue; // Regular meeting venue / lab

    private String eligibility; // Membership eligibility criteria

    // ─────────────────────────────────────────────────────────────────────────

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "club", cascade = CascadeType.ALL)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    @com.fasterxml.jackson.annotation.JsonIgnore
    private List<Event> events;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
