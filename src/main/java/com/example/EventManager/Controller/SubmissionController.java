package com.example.EventManager.Controller;

import com.example.EventManager.dto.ToolSubmissionRequest;
import com.example.EventManager.entity.EventSubmission;
import com.example.EventManager.entity.User;
import com.example.EventManager.service.SubmissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/submissions")
@RequiredArgsConstructor
public class SubmissionController {

    private final SubmissionService submissionService;

    @PostMapping("/{eventId}")
    public ResponseEntity<EventSubmission> submit(
            @PathVariable Long eventId,
            @RequestBody ToolSubmissionRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(submissionService.createOrUpdateSubmission(eventId, request, currentUser));
    }

    @GetMapping("/{eventId}")
    public ResponseEntity<List<EventSubmission>> getSubmissions(@PathVariable Long eventId) {
        return ResponseEntity.ok(submissionService.getSubmissionsByEvent(eventId));
    }

    @GetMapping("/{eventId}/my")
    public ResponseEntity<EventSubmission> getMySubmission(
            @PathVariable Long eventId,
            @AuthenticationPrincipal User currentUser) {
        return submissionService.getMySubmission(eventId, currentUser.getId())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }
}
