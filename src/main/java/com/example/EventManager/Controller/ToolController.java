package com.example.EventManager.Controller;

import com.example.EventManager.dto.*;
import com.example.EventManager.entity.EventSubmission;
import com.example.EventManager.entity.User;
import com.example.EventManager.service.ToolService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tools")
@RequiredArgsConstructor
public class ToolController {

    private final ToolService toolService;

    /**
     * Catalog of EventTypes & default recommended ToolTypes for the Creation Wizard
     */
    @GetMapping("/types-and-defaults")
    public ResponseEntity<Map<String, Object>> getTypesAndDefaults() {
        return ResponseEntity.ok(toolService.getTypesAndDefaults());
    }

    // ============================================================
    // 1. Coding Engine Endpoints
    // ============================================================

    @PostMapping("/coding/run")
    public ResponseEntity<CodeRunResponse> runCode(
            @RequestBody CodeRunRequest request,
            @AuthenticationPrincipal User currentUser) {
        request.setSubmission(false);
        return ResponseEntity.ok(toolService.runOrSubmitCode(request, currentUser));
    }

    @PostMapping("/coding/submit")
    public ResponseEntity<CodeRunResponse> submitCode(
            @RequestBody CodeRunRequest request,
            @AuthenticationPrincipal User currentUser) {
        request.setSubmission(true);
        return ResponseEntity.ok(toolService.runOrSubmitCode(request, currentUser));
    }

    // ============================================================
    // 2. Quiz Engine Endpoints
    // ============================================================

    @GetMapping("/quiz/{eventId}")
    public ResponseEntity<List<Map<String, Object>>> getQuizQuestions(@PathVariable Long eventId) {
        return ResponseEntity.ok(toolService.getQuizQuestions(eventId));
    }

    @PostMapping("/quiz/{eventId}/submit")
    public ResponseEntity<QuizSubmitResponse> submitQuiz(
            @PathVariable Long eventId,
            @RequestBody QuizSubmitRequest request,
            @AuthenticationPrincipal User currentUser) {
        request.setEventId(eventId);
        return ResponseEntity.ok(toolService.submitQuiz(request, currentUser));
    }

    // ============================================================
    // 3. Submissions (Poster Design, Hackathon, Project Expo)
    // ============================================================

    @PostMapping("/submissions/{eventId}")
    public ResponseEntity<EventSubmission> saveSubmission(
            @PathVariable Long eventId,
            @RequestBody ToolSubmissionRequest request,
            @AuthenticationPrincipal User currentUser) {
        request.setEventId(eventId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(toolService.saveSubmission(request, currentUser));
    }

    @GetMapping("/submissions/{eventId}")
    public ResponseEntity<List<EventSubmission>> getEventSubmissions(@PathVariable Long eventId) {
        return ResponseEntity.ok(toolService.getSubmissionsForEvent(eventId));
    }

    @GetMapping("/submissions/{eventId}/my")
    public ResponseEntity<EventSubmission> getMySubmission(
            @PathVariable Long eventId,
            @AuthenticationPrincipal User currentUser) {
        return toolService.getMySubmission(eventId, currentUser.getId())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    // ============================================================
    // 4. Judge Evaluations & Leaderboards
    // ============================================================

    @PostMapping("/evaluations/{submissionId}")
    @PreAuthorize("hasAnyRole('DEVELOPER', 'FACULTY_COORDINATOR')")
    public ResponseEntity<EventSubmission> evaluateSubmission(
            @PathVariable Long submissionId,
            @RequestBody JudgeEvaluationRequest request,
            @AuthenticationPrincipal User reviewer) {
        return ResponseEntity.ok(toolService.evaluateSubmission(submissionId, request, reviewer));
    }

    @GetMapping("/leaderboard/{eventId}")
    public ResponseEntity<List<Map<String, Object>>> getLeaderboard(@PathVariable Long eventId) {
        return ResponseEntity.ok(toolService.getLeaderboard(eventId));
    }
}
