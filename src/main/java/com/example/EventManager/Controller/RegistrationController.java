package com.example.EventManager.Controller;

import com.example.EventManager.dto.registration.CheckInRequest;
import com.example.EventManager.dto.registration.RegistrationOverviewDTO;
import com.example.EventManager.dto.registration.RegistrationRequest;
import com.example.EventManager.dto.registration.RegistrationResponse;
import com.example.EventManager.entity.User;
import com.example.EventManager.enums.RegistrationStatus;
import com.example.EventManager.service.RegistrationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class RegistrationController {

    private final RegistrationService registrationService;

    /**
     * Student registers for an event with dynamic custom fields.
     * Supports both /api/events/{eventId}/register and /api/registrations/{eventId}
     */
    @PostMapping({"/events/{eventId}/register", "/registrations/{eventId}"})
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<RegistrationResponse> register(
            @PathVariable Long eventId,
            @RequestBody(required = false) RegistrationRequest request,
            @AuthenticationPrincipal User currentUser) {
        if (request == null) {
            request = new RegistrationRequest();
        }
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(registrationService.register(eventId, request, currentUser));
    }

    /**
     * Coordinator/Faculty view all registrations for a specific event.
     */
    @GetMapping({"/events/{eventId}/registrations", "/registrations/event/{eventId}"})
    @PreAuthorize("hasAnyRole('DEVELOPER', 'COORDINATOR', 'FACULTY_COORDINATOR')")
    public ResponseEntity<List<RegistrationResponse>> getEventRegistrations(
            @PathVariable Long eventId,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(registrationService.getEventRegistrations(eventId, currentUser));
    }

    /**
     * Student views their registered events.
     */
    @GetMapping("/registrations/my")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<List<RegistrationResponse>> myRegistrations(
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(registrationService.getMyRegistrations(currentUser));
    }

    /**
     * View single registration details / ticket QR data.
     */
    @GetMapping("/registrations/{id}")
    public ResponseEntity<RegistrationResponse> getRegistration(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(registrationService.getRegistrationById(id, currentUser));
    }

    /**
     * Coordinator/Faculty update registration status (e.g. promote waitlist or cancel).
     */
    @PutMapping("/registrations/{id}/status")
    @PreAuthorize("hasAnyRole('DEVELOPER', 'COORDINATOR', 'FACULTY_COORDINATOR')")
    public ResponseEntity<RegistrationResponse> updateStatus(
            @PathVariable Long id,
            @RequestParam RegistrationStatus status,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(registrationService.updateStatus(id, status, currentUser));
    }

    /**
     * Student cancels their registration.
     */
    @DeleteMapping("/registrations/{eventId}")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<Void> cancelRegistration(
            @PathVariable Long eventId,
            @AuthenticationPrincipal User currentUser) {
        registrationService.cancelRegistration(eventId, currentUser);
        return ResponseEntity.noContent().build();
    }

    /**
     * Event-day check-in: Coordinator marks attendance via QR code or Registration Number.
     */
    @PostMapping("/events/{eventId}/check-in")
    @PreAuthorize("hasAnyRole('DEVELOPER', 'COORDINATOR', 'FACULTY_COORDINATOR')")
    public ResponseEntity<RegistrationResponse> checkIn(
            @PathVariable Long eventId,
            @RequestBody CheckInRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(registrationService.checkIn(eventId, request.getTicketOrRegNumber(), currentUser));
    }

    /**
     * Faculty/Developer registration capacity and attendance overview across all events.
     */
    @GetMapping("/registrations/overview")
    @PreAuthorize("hasAnyRole('DEVELOPER', 'FACULTY_COORDINATOR')")
    public ResponseEntity<List<RegistrationOverviewDTO>> getOverview(
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(registrationService.getOverview(currentUser));
    }

    /**
     * Student submits post-event rating (1-5 stars) and feedback review.
     */
    @PostMapping("/events/{eventId}/feedback")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<RegistrationResponse> submitFeedback(
            @PathVariable Long eventId,
            @RequestBody com.example.EventManager.dto.EventFeedbackRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(registrationService.submitFeedback(eventId, request, currentUser));
    }

    /**
     * Coordinator/Faculty/Developer views event analytics and attendee ratings.
     */
    @GetMapping("/events/{eventId}/analytics")
    @PreAuthorize("hasAnyRole('DEVELOPER', 'COORDINATOR', 'FACULTY_COORDINATOR')")
    public ResponseEntity<com.example.EventManager.dto.EventAnalyticsDTO> getEventAnalytics(
            @PathVariable Long eventId,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(registrationService.getEventAnalytics(eventId, currentUser));
    }
}
