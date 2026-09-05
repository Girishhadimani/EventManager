package com.example.EventManager.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EventFeedbackRequest {
    private Integer rating;       // 1 to 5 stars
    private String comments;      // Feedback text
}
