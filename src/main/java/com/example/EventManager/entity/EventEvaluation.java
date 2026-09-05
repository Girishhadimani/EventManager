package com.example.EventManager.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "event_evaluations")
public class EventEvaluation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "submission_id", nullable = false)
    private EventSubmission submission;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "reviewer_id", nullable = false)
    private User reviewer;

    private int innovationScore;    // max 20
    private int technicalScore;     // max 20
    private int uiScore;            // max 15
    private int impactScore;        // max 20
    private int presentationScore;  // max 10
    private int demoScore;          // max 15
    private int totalScore;         // sum (max 100)

    @Column(columnDefinition = "TEXT")
    private String remarks;

    @Column(name = "evaluated_at", nullable = false)
    private LocalDateTime evaluatedAt;

    @PrePersist
    protected void onCreate() {
        this.evaluatedAt = LocalDateTime.now();
        this.totalScore = innovationScore + technicalScore + uiScore + impactScore + presentationScore + demoScore;
    }
}
