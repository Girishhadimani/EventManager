package com.example.EventManager.service;

import com.example.EventManager.dto.QuizSubmitRequest;
import com.example.EventManager.dto.QuizSubmitResponse;
import com.example.EventManager.entity.Event;
import com.example.EventManager.entity.EventSubmission;
import com.example.EventManager.entity.User;
import com.example.EventManager.exception.ResourceNotFoundException;
import com.example.EventManager.repository.EventRepository;
import com.example.EventManager.repository.EventSubmissionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class QuizService {

    private final EventRepository eventRepository;
    private final EventSubmissionRepository submissionRepository;

    public List<Map<String, Object>> getQuestions(Long eventId) {
        List<Map<String, Object>> questions = new ArrayList<>();

        questions.add(Map.of(
                "id", 1,
                "question", "Which HTTP method is idempotent and used for full updates to a resource in REST APIs?",
                "options", List.of("POST", "PUT", "PATCH", "CONNECT"),
                "timeLimit", 30
        ));

        questions.add(Map.of(
                "id", 2,
                "question", "In Spring Security, what component is responsible for storing the current security context and principal?",
                "options", List.of("SecurityContextHolder", "AuthenticationManager", "UserDetailsService", "WebSecurityConfigurer"),
                "timeLimit", 30
        ));

        questions.add(Map.of(
                "id", 3,
                "question", "What is the worst-case time complexity of QuickSort with standard pivoting?",
                "options", List.of("O(n log n)", "O(n)", "O(n²)", "O(log n)"),
                "timeLimit", 30
        ));

        questions.add(Map.of(
                "id", 4,
                "question", "In PostgreSQL, which constraint guarantees uniqueness and creates a B-Tree index automatically?",
                "options", List.of("CHECK", "NOT NULL", "PRIMARY KEY", "FOREIGN KEY"),
                "timeLimit", 30
        ));

        questions.add(Map.of(
                "id", 5,
                "question", "What is the primary benefit of stateless JWT authentication in modern web applications?",
                "options", List.of(
                        "No session state stored in server memory (highly scalable)",
                        "Tokens cannot be tampered with or revoked",
                        "Tokens automatically encrypt all request payloads",
                        "Tokens bypass CORS policies"
                ),
                "timeLimit", 30
        ));

        return questions;
    }

    @Transactional
    public QuizSubmitResponse evaluateQuiz(Long eventId, QuizSubmitRequest request, User currentUser) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event", eventId));

        if (!event.isToolsOpened()) {
            throw new IllegalArgumentException("The competition tools for this event are currently locked by the coordinator. Please wait until the coordinator opens the workspace.");
        }

        Map<Integer, Integer> answerKeys = Map.of(
                0, 1, // PUT
                1, 0, // SecurityContextHolder
                2, 2, // O(n^2)
                3, 2, // PRIMARY KEY
                4, 0  // No session state stored
        );

        List<String> questionTexts = List.of(
                "HTTP method for idempotent full update (PUT)",
                "Component storing security context (SecurityContextHolder)",
                "Worst-case QuickSort complexity (O(n²))",
                "PostgreSQL constraint with auto B-Tree index (PRIMARY KEY)",
                "Primary benefit of stateless JWT (Scalable, no server session)"
        );

        int total = 5;
        int correct = 0;
        List<QuizSubmitResponse.QuestionReview> reviews = new ArrayList<>();

        for (int i = 0; i < total; i++) {
            int selected = request.getAnswers() != null && request.getAnswers().containsKey(i)
                    ? request.getAnswers().get(i)
                    : -1;
            int right = answerKeys.get(i);
            boolean isRight = (selected == right);
            if (isRight) correct++;

            reviews.add(QuizSubmitResponse.QuestionReview.builder()
                    .questionIndex(i + 1)
                    .question(questionTexts.get(i))
                    .selectedOption(selected)
                    .correctOption(right)
                    .isCorrect(isRight)
                    .build());
        }

        int score = correct * 20; // 100 max
        double percentage = (correct / (double) total) * 100.0;
        String badge = (score >= 80) ? "🥇 Gold Mastery" : (score >= 60) ? "🥈 Silver Achiever" : "🥉 Participant";

        EventSubmission submission = submissionRepository.findByEvent_IdAndUser_Id(event.getId(), currentUser.getId())
                .orElse(EventSubmission.builder()
                        .event(event)
                        .user(currentUser)
                        .submissionType("QUIZ")
                        .title(event.getTitle() + " - Quiz Attempt")
                        .build());

        submission.setScore(score);
        submission.setStatus("EVALUATED");
        submission.setDescription("Correct: " + correct + "/" + total + " (" + (int) percentage + "%) | Time: " + request.getTimeSpentSeconds() + "s");
        submission.setSubmittedAt(LocalDateTime.now());
        submissionRepository.save(submission);

        return QuizSubmitResponse.builder()
                .totalQuestions(total)
                .correctAnswers(correct)
                .score(score)
                .percentage(percentage)
                .rankBadge(badge)
                .reviews(reviews)
                .build();
    }
}
