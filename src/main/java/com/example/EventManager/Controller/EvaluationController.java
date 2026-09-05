package com.example.EventManager.Controller;

import com.example.EventManager.dto.JudgeEvaluationRequest;
import com.example.EventManager.entity.EventEvaluation;
import com.example.EventManager.entity.EventSubmission;
import com.example.EventManager.entity.User;
import com.example.EventManager.service.EvaluationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/evaluations")
@RequiredArgsConstructor
public class EvaluationController {

    private final EvaluationService evaluationService;

    @PostMapping("/{submissionId}")
    @PreAuthorize("hasAnyRole('DEVELOPER', 'FACULTY_COORDINATOR')")
    public ResponseEntity<EventSubmission> evaluate(
            @PathVariable Long submissionId,
            @RequestBody JudgeEvaluationRequest request,
            @AuthenticationPrincipal User reviewer) {
        return ResponseEntity.ok(evaluationService.evaluate(submissionId, request, reviewer));
    }

    @GetMapping("/submission/{submissionId}")
    @PreAuthorize("hasAnyRole('DEVELOPER', 'FACULTY_COORDINATOR')")
    public ResponseEntity<List<EventEvaluation>> getEvaluations(@PathVariable Long submissionId) {
        return ResponseEntity.ok(evaluationService.getEvaluationsForSubmission(submissionId));
    }
}
