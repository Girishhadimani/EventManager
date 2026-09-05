package com.example.EventManager.Controller;

import com.example.EventManager.dto.QuizSubmitRequest;
import com.example.EventManager.dto.QuizSubmitResponse;
import com.example.EventManager.entity.User;
import com.example.EventManager.service.QuizService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/quiz")
@RequiredArgsConstructor
public class QuizController {

    private final QuizService quizService;

    @GetMapping("/{eventId}")
    public ResponseEntity<List<Map<String, Object>>> getQuestions(@PathVariable Long eventId) {
        return ResponseEntity.ok(quizService.getQuestions(eventId));
    }

    @PostMapping("/{eventId}/submit")
    public ResponseEntity<QuizSubmitResponse> submitQuiz(
            @PathVariable Long eventId,
            @RequestBody QuizSubmitRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(quizService.evaluateQuiz(eventId, request, currentUser));
    }
}
