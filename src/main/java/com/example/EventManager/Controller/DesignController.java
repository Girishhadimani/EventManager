package com.example.EventManager.Controller;

import com.example.EventManager.dto.ToolSubmissionRequest;
import com.example.EventManager.entity.EventSubmission;
import com.example.EventManager.entity.User;
import com.example.EventManager.service.DesignService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/design")
@RequiredArgsConstructor
public class DesignController {

    private final DesignService designService;

    @PostMapping("/submit/{eventId}")
    public ResponseEntity<EventSubmission> submitPoster(
            @PathVariable Long eventId,
            @RequestBody ToolSubmissionRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(designService.saveDesignSubmission(eventId, request, currentUser));
    }
}
