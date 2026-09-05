package com.example.EventManager.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "event_submissions")
public class EventSubmission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "event_id", nullable = false)
    private Event event;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "submission_type", nullable = false)
    private String submissionType; // "CODING", "QUIZ", "DESIGN", "HACKATHON", "PROJECT"

    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "TEXT")
    private String content; // Code / Notes / Canvas JSON

    @Column(name = "data_url", columnDefinition = "TEXT")
    private String dataUrl; // Poster Image Base64 / data URL

    @Column(name = "github_url")
    private String githubUrl;

    @Column(name = "demo_url")
    private String demoUrl;

    @Column(name = "video_url")
    private String videoUrl;

    @Column(name = "team_name")
    private String teamName;

    @Column(name = "team_members", columnDefinition = "TEXT")
    private String teamMembers;

    @Builder.Default
    private int score = 0;

    @Builder.Default
    private String status = "SUBMITTED"; // "SUBMITTED", "EVALUATED", "QUALIFIED", "WINNER"

    @Column(name = "judge_remarks", columnDefinition = "TEXT")
    private String judgeRemarks;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "reviewed_by")
    private User reviewedBy;

    @Column(name = "submitted_at", nullable = false, updatable = false)
    private LocalDateTime submittedAt;

    @Column(name = "evaluated_at")
    private LocalDateTime evaluatedAt;

    @PrePersist
    protected void onCreate() {
        this.submittedAt = LocalDateTime.now();
    }
}
