package com.example.EventManager.Controller;

import com.example.EventManager.dto.EventApprovalRequest;
import com.example.EventManager.entity.Event;
import com.example.EventManager.entity.User;
import com.example.EventManager.service.EventApprovalService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
public class EventApprovalController {

    private final EventApprovalService approvalService;

    @PatchMapping("/{id}/approval/approve")
    @PreAuthorize("hasAnyRole('DEVELOPER', 'FACULTY_COORDINATOR')")
    public ResponseEntity<Event> approveEvent(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(approvalService.approveEvent(id, currentUser));
    }

    @PatchMapping("/{id}/approval/reject")
    @PreAuthorize("hasAnyRole('DEVELOPER', 'FACULTY_COORDINATOR')")
    public ResponseEntity<Event> rejectEvent(
            @PathVariable Long id,
            @RequestBody EventApprovalRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(approvalService.rejectEvent(id, request.getRejectionReason(), currentUser));
    }
}
