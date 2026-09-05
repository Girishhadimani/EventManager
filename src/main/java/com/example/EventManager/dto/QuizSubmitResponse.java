package com.example.EventManager.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuizSubmitResponse {
    private int totalQuestions;
    private int correctAnswers;
    private int score;
    private double percentage;
    private String rankBadge;
    private List<QuestionReview> reviews;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuestionReview {
        private int questionIndex;
        private String question;
        private int selectedOption;
        private int correctOption;
        private boolean isCorrect;
    }
}
