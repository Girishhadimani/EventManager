package com.example.EventManager.entity;

import com.example.EventManager.enums.EventStatus;
import com.example.EventManager.enums.EventType;
import com.example.EventManager.enums.ToolType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashSet;
import java.util.Set;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "events")
public class Event {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private LocalDate date;

    private LocalTime time;

    private LocalTime startTime;

    private LocalTime endTime;

    private String venue;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type")
    private EventType eventType;

    @ElementCollection(fetch = FetchType.EAGER)
    @Enumerated(EnumType.STRING)
    @CollectionTable(name = "event_tools", joinColumns = @JoinColumn(name = "event_id"))
    @Column(name = "tool_type")
    @Builder.Default
    private Set<ToolType> tools = new HashSet<>();

    @Column(name = "tool_config", columnDefinition = "TEXT")
    private String toolConfig;

    @Column(name = "max_participants")
    @Builder.Default
    private Integer maxParticipants = 100;

    @Column(name = "registration_deadline")
    private LocalDate registrationDeadline;

    @Column(name = "activity_points")
    private Integer activityPoints;

    public int getEffectiveActivityPoints() {
        if (activityPoints != null && activityPoints > 0) {
            return activityPoints;
        }
        if (eventType == null) return 10;
        return switch (eventType) {
            case HACKATHON, PROJECT_EXHIBITION -> 20;
            case CODING, WORKSHOP, QUIZ, DESIGN -> 10;
            case DEBATE, CULTURAL, SPORTS -> 5;
            default -> 10;
        };
    }

    @Column(name = "registration_form_schema", columnDefinition = "TEXT")
    private String registrationFormSchema;

    @Column(name = "tools_opened", columnDefinition = "boolean default false")
    @Builder.Default
    private boolean toolsOpened = false;

    @Column(name = "tools_opened_at")
    private LocalDateTime toolsOpenedAt;

    @Column(name = "tools_closed_at")
    private LocalDateTime toolsClosedAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EventStatus status;

    // Reason filled in by Faculty Coordinator when rejecting
    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    // Many events belong to one club
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "club_id", nullable = false)
    private Club club;

    // Who created this event (COORDINATOR / FACULTY_COORDINATOR / DEVELOPER)
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    // Who approved or rejected this event
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "reviewed_by")
    private User reviewedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.status == null) {
            this.status = EventStatus.PENDING;
        }
        if (this.eventType == null) {
            this.eventType = EventType.OTHER;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
