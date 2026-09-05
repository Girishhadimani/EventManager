package com.example.EventManager.entity;

import com.example.EventManager.enums.RegistrationStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "event_registrations",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "event_id"}))
public class EventRegistration {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Unique human-readable ticket code (e.g. REG-2026-00182)
    @Column(name = "registration_number", unique = true)
    private String registrationNumber;

    // The student who registered
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // The event they registered for
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "event_id", nullable = false)
    private Event event;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RegistrationStatus status;

    @Column(name = "registered_at", nullable = false, updatable = false)
    private LocalDateTime registeredAt;

    @Column(name = "checked_in_at")
    private LocalDateTime checkedInAt;

    // Snapshot of student information at time of registration
    @Column(name = "student_name")
    private String studentName;

    @Column(name = "student_email")
    private String studentEmail;

    @Column(name = "phone")
    private String phone;

    @Column(name = "usn_or_student_id")
    private String usnOrStudentId;

    @Column(name = "department")
    private String department;

    @Column(name = "academic_year")
    private String year;

    // JSON-encoded event-type specific dynamic fields (e.g. languages, teamName, category, etc.)
    @Column(name = "custom_data", columnDefinition = "TEXT")
    private String customData;

    // Secure verification token or data payload for QR code rendering
    @Column(name = "qr_code_data", columnDefinition = "TEXT")
    private String qrCodeData;

    // Post-Event Feedback & Rating (1 to 5 Stars)
    @Column(name = "feedback_rating")
    private Integer feedbackRating;

    @Column(name = "feedback_comments", columnDefinition = "TEXT")
    private String feedbackComments;

    @Column(name = "feedback_submitted_at")
    private LocalDateTime feedbackSubmittedAt;

    // Team / Group Registration
    @Column(name = "team_name")
    private String teamName;

    @Column(name = "team_members", columnDefinition = "TEXT")
    private String teamMembers;

    @Column(name = "is_team_lead")
    @Builder.Default
    private Boolean isTeamLead = true;

    // VTU AICTE Activity Points Earned upon verified attendance
    @Column(name = "activity_points_earned")
    private Integer activityPointsEarned;

    @PrePersist
    protected void onCreate() {
        this.registeredAt = LocalDateTime.now();
        if (this.status == null) {
            this.status = RegistrationStatus.CONFIRMED;
        }
    }
}
