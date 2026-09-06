package com.example.EventManager.Controller;

import com.example.EventManager.dto.ConflictCheckRequest;
import com.example.EventManager.dto.ConflictCheckResponse;
import com.example.EventManager.dto.EventApprovalRequest;
import com.example.EventManager.dto.EventRequest;
import com.example.EventManager.dto.ToolsStatusResponse;
import com.example.EventManager.entity.Event;
import com.example.EventManager.entity.EventApprovalHistory;
import com.example.EventManager.entity.EventRegistration;
import com.example.EventManager.entity.User;
import com.example.EventManager.enums.EventStatus;
import com.example.EventManager.service.EventService;
import com.example.EventManager.service.RegistrationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
public class EventController {

    private final EventService eventService;

    // ---- Read ----

    /** DEVELOPER sees ALL events; others see APPROVED only via /approved */
    @GetMapping
    @PreAuthorize("hasRole('DEVELOPER')")
    public ResponseEntity<List<Event>> getAllEvents() {
        return ResponseEntity.ok(eventService.getAllEvents());
    }

    /** Public / students see APPROVED events */
    @GetMapping("/approved")
    public ResponseEntity<List<Event>> getApprovedEvents() {
        return ResponseEntity.ok(eventService.getApprovedEvents());
    }

    /** Faculty Coordinator pending queue */
    @GetMapping("/pending")
    @PreAuthorize("hasAnyRole('DEVELOPER', 'FACULTY_COORDINATOR')")
    public ResponseEntity<List<Event>> getPendingEvents() {
        return ResponseEntity.ok(eventService.getPendingEvents());
    }

    /** Coordinator gets all events for their assigned club */
    @GetMapping("/my")
    @PreAuthorize("hasRole('COORDINATOR')")
    public ResponseEntity<List<Event>> getMyClubEvents(@AuthenticationPrincipal User currentUser) {
        if (currentUser == null || currentUser.getClub() == null) {
            return ResponseEntity.ok(List.of());
        }
        return ResponseEntity.ok(eventService.getEventsByClub(currentUser.getClub().getId()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Event> getEvent(@PathVariable Long id) {
        return ResponseEntity.ok(eventService.getEventById(id));
    }

    @GetMapping("/club/{clubId}")
    @PreAuthorize("hasAnyRole('DEVELOPER', 'COORDINATOR', 'FACULTY_COORDINATOR')")
    public ResponseEntity<List<Event>> getEventsByClub(@PathVariable Long clubId) {
        return ResponseEntity.ok(eventService.getEventsByClub(clubId));
    }

    // ---- Create ----

    @PostMapping
    @PreAuthorize("hasAnyRole('DEVELOPER', 'COORDINATOR', 'FACULTY_COORDINATOR')")
    public ResponseEntity<Event> createEvent(
            @Valid @RequestBody EventRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(eventService.createEvent(request, currentUser));
    }

    // ---- Update / Resubmit ----

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('DEVELOPER', 'COORDINATOR', 'FACULTY_COORDINATOR')")
    public ResponseEntity<Event> updateEvent(
            @PathVariable Long id,
            @Valid @RequestBody EventRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(eventService.updateEvent(id, request, currentUser));
    }

    // ---- Faculty Coordinator: Approve ----

    @PatchMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('DEVELOPER', 'FACULTY_COORDINATOR')")
    public ResponseEntity<Event> approveEvent(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(eventService.approveEvent(id, currentUser));
    }

    // ---- Faculty Coordinator: Reject ----

    @PatchMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('DEVELOPER', 'FACULTY_COORDINATOR')")
    public ResponseEntity<Event> rejectEvent(
            @PathVariable Long id,
            @RequestBody EventApprovalRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(
                eventService.rejectEvent(id, request.getRejectionReason(), currentUser));
    }

    // ---- Cancel ----

    @PatchMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('DEVELOPER', 'COORDINATOR', 'FACULTY_COORDINATOR')")
    public ResponseEntity<Event> cancelEvent(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(eventService.cancelEvent(id, currentUser));
    }

    // ---- Conflict Detection ----

    @PostMapping("/check-conflict")
    @PreAuthorize("hasAnyRole('DEVELOPER', 'COORDINATOR', 'FACULTY_COORDINATOR')")
    public ResponseEntity<ConflictCheckResponse> checkConflict(@RequestBody ConflictCheckRequest request) {
        return ResponseEntity.ok(eventService.checkConflict(request));
    }

    // ---- History ----

    @GetMapping("/{id}/history")
    @PreAuthorize("hasAnyRole('DEVELOPER', 'COORDINATOR', 'FACULTY_COORDINATOR')")
    public ResponseEntity<List<EventApprovalHistory>> getApprovalHistory(@PathVariable Long id) {
        return ResponseEntity.ok(eventService.getApprovalHistory(id));
    }

    // ---- Lifecycle State Transition ----

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('DEVELOPER', 'COORDINATOR', 'FACULTY_COORDINATOR')")
    public ResponseEntity<Event> updateStatus(
            @PathVariable Long id,
            @RequestParam EventStatus status,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(eventService.updateEventStatus(id, status, currentUser));
    }

    // ---- Tool Gating Engine ----

    @PatchMapping("/{id}/toggle-tools")
    @PreAuthorize("hasAnyRole('DEVELOPER', 'COORDINATOR')")
    public ResponseEntity<Event> toggleTools(
            @PathVariable Long id,
            @RequestParam boolean open,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(eventService.toggleToolsAccess(id, open, currentUser));
    }

    @GetMapping("/{id}/tools-status")
    public ResponseEntity<ToolsStatusResponse> getToolsStatus(@PathVariable Long id) {
        return ResponseEntity.ok(eventService.getToolsStatus(id));
    }

    // ---- Delete ----

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('DEVELOPER')")
    public ResponseEntity<Void> deleteEvent(@PathVariable Long id) {
        eventService.deleteEvent(id);
        return ResponseEntity.noContent().build();
    }
}
