package com.example.EventManager.dto;

import lombok.Data;

@Data
public class ToolSubmissionRequest {
    private Long eventId;
    private String submissionType; // "DESIGN", "HACKATHON", "PROJECT", "CODING", "QUIZ", "GENERAL"
    private String title;
    private String description;
    private String content;        // Text / code / notes / canvas JSON
    private String dataUrl;        // Canvas PNG data URL / design export
    private String githubUrl;      // GitHub repo URL
    private String demoUrl;        // Live web demo URL
    private String videoUrl;       // Video demo link
    private String teamName;
    private String teamMembers;
}
