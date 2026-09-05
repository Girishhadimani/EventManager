package com.example.EventManager.service;

import com.example.EventManager.dto.EventAnalyticsDTO;
import com.example.EventManager.dto.EventFeedbackRequest;
import com.example.EventManager.dto.registration.RegistrationOverviewDTO;
import com.example.EventManager.dto.registration.RegistrationRequest;
import com.example.EventManager.dto.registration.RegistrationResponse;
import com.example.EventManager.entity.Club;
import com.example.EventManager.entity.Event;
import com.example.EventManager.entity.EventRegistration;
import com.example.EventManager.entity.User;
import com.example.EventManager.enums.RegistrationStatus;
import com.example.EventManager.enums.Role;
import com.example.EventManager.exception.ResourceNotFoundException;
import com.example.EventManager.repository.EventRepository;
import com.example.EventManager.repository.RegistrationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class RegistrationService {

    private final RegistrationRepository registrationRepository;
    private final EventRepository eventRepository;

    /**
     * Register a student for an event with dynamic custom fields.
     */
    @Transactional
    public RegistrationResponse register(Long eventId, RegistrationRequest request, User student) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event", eventId));

        // 1. Check event lifecycle status
        switch (event.getStatus()) {
            case PENDING   -> throw new IllegalArgumentException("This event is awaiting approval and is not open for registration yet.");
            case REJECTED  -> throw new IllegalArgumentException("This event was not approved and is not available for registration.");
            case CANCELLED -> throw new IllegalArgumentException("This event has been cancelled.");
            case COMPLETED -> throw new IllegalArgumentException("This event has already completed.");
            default -> { /* APPROVED — proceed */ }
        }

        // 2. Check registration deadline
        if (event.getRegistrationDeadline() != null && LocalDate.now().isAfter(event.getRegistrationDeadline())) {
            throw new IllegalArgumentException("Registration closed for this event on " + event.getRegistrationDeadline());
        }

        // 3. Check for existing registration
        Optional<EventRegistration> existingOpt = registrationRepository.findByUserAndEvent(student, event);
        if (existingOpt.isPresent() && existingOpt.get().getStatus() != RegistrationStatus.CANCELLED) {
            throw new IllegalArgumentException("You are already registered for this event (Status: " + existingOpt.get().getStatus() + ").");
        }

        // 4. Capacity and Waitlist calculation
        long confirmedCount = registrationRepository.countByEventAndStatus(event, RegistrationStatus.CONFIRMED)
                + registrationRepository.countByEventAndStatus(event, RegistrationStatus.ATTENDED)
                + registrationRepository.countByEventAndStatus(event, RegistrationStatus.REGISTERED);

        RegistrationStatus assignedStatus = RegistrationStatus.CONFIRMED;
        if (event.getMaxParticipants() != null && confirmedCount >= event.getMaxParticipants()) {
            assignedStatus = RegistrationStatus.WAITLISTED;
        }

        // 5. Generate human-readable registration number (e.g. REG-2026-00182)
        int year = (event.getDate() != null) ? event.getDate().getYear() : LocalDate.now().getYear();
        String regNumber = String.format("REG-%d-%05d", year, (int)(Math.random() * 90000) + 10000);

        // 6. Generate QR Verification Token
        String tokenUuid = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        String qrData = String.format("{\"reg\":\"%s\",\"evt\":%d,\"usn\":\"%s\",\"token\":\"%s\"}",
                regNumber, event.getId(), request.getUsnOrStudentId() != null ? request.getUsnOrStudentId() : student.getId(), tokenUuid);

        EventRegistration registration = existingOpt.orElse(new EventRegistration());
        registration.setUser(student);
        registration.setEvent(event);
        registration.setRegistrationNumber(regNumber);
        registration.setStatus(assignedStatus);
        registration.setStudentName(student.getName());
        registration.setStudentEmail(student.getEmail());
        registration.setPhone(request.getPhone());
        registration.setUsnOrStudentId(request.getUsnOrStudentId());
        registration.setDepartment(request.getDepartment());
        registration.setYear(request.getYear());
        registration.setCustomData(request.getCustomData());
        registration.setQrCodeData(qrData);
        registration.setTeamName(request.getTeamName());
        registration.setTeamMembers(request.getTeamMembers());
        registration.setIsTeamLead(request.getTeamName() != null && !request.getTeamName().isBlank());
        registration.setRegisteredAt(LocalDateTime.now());
        registration.setCheckedInAt(null);

        EventRegistration saved = registrationRepository.save(registration);
        return mapToResponse(saved);
    }

    /**
     * Cancel registration and auto-promote waitlisted student if space becomes available.
     */
    @Transactional
    public void cancelRegistration(Long eventId, User student) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event", eventId));

        EventRegistration registration = registrationRepository.findByUserAndEvent(student, event)
                .orElseThrow(() -> new ResourceNotFoundException("Registration not found for this event"));

        if (registration.getStatus() == RegistrationStatus.CANCELLED) {
            return;
        }

        boolean wasConfirmed = (registration.getStatus() == RegistrationStatus.CONFIRMED || registration.getStatus() == RegistrationStatus.REGISTERED);
        registration.setStatus(RegistrationStatus.CANCELLED);
        registrationRepository.save(registration);

        // Smart Waitlist Promotion: If the cancelled registration held a confirmed spot, promote the earliest waitlisted participant
        if (wasConfirmed) {
            Optional<EventRegistration> waitlistedOpt = registrationRepository
                    .findFirstByEventAndStatusOrderByRegisteredAtAsc(event, RegistrationStatus.WAITLISTED);
            if (waitlistedOpt.isPresent()) {
                EventRegistration promoted = waitlistedOpt.get();
                promoted.setStatus(RegistrationStatus.CONFIRMED);
                registrationRepository.save(promoted);
            }
        }
    }

    /**
     * Get all registrations for a specific event with club security.
     */
    public List<RegistrationResponse> getEventRegistrations(Long eventId, User currentUser) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event", eventId));

        if (currentUser.getRole() == Role.COORDINATOR) {
            Club coordClub = currentUser.getClub();
            if (coordClub == null || !coordClub.getId().equals(event.getClub().getId())) {
                throw new AccessDeniedException("Coordinators can only manage registrations for events of their own club.");
            }
        }

        return registrationRepository.findByEventOrderByRegisteredAtAsc(event)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    /**
     * Get all registrations of the logged in student.
     */
    public List<RegistrationResponse> getMyRegistrations(User student) {
        return registrationRepository.findByUserOrderByRegisteredAtDesc(student)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    /**
     * Get a single registration detail.
     */
    public RegistrationResponse getRegistrationById(Long id, User currentUser) {
        EventRegistration reg = registrationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Registration", id));

        if (currentUser.getRole() == Role.USER && !reg.getUser().getId().equals(currentUser.getId())) {
            throw new AccessDeniedException("Access denied to another student's registration.");
        }
        return mapToResponse(reg);
    }

    /**
     * Coordinator/Faculty updates a participant's status (CONFIRMED, WAITLISTED, CANCELLED, etc.).
     */
    @Transactional
    public RegistrationResponse updateStatus(Long id, RegistrationStatus newStatus, User currentUser) {
        EventRegistration reg = registrationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Registration", id));

        if (currentUser.getRole() == Role.COORDINATOR) {
            Club coordClub = currentUser.getClub();
            if (coordClub == null || !coordClub.getId().equals(reg.getEvent().getClub().getId())) {
                throw new AccessDeniedException("You can only modify registrations for your own club's events.");
            }
        }

        reg.setStatus(newStatus);
        if (newStatus == RegistrationStatus.ATTENDED) {
            if (reg.getCheckedInAt() == null) {
                reg.setCheckedInAt(LocalDateTime.now());
            }
            if (reg.getActivityPointsEarned() == null || reg.getActivityPointsEarned() == 0) {
                reg.setActivityPointsEarned(reg.getEvent().getEffectiveActivityPoints());
            }
        }
        return mapToResponse(registrationRepository.save(reg));
    }

    /**
     * Event-day check-in: Coordinator scans QR or enters Registration Number.
     */
    @Transactional
    public RegistrationResponse checkIn(Long eventId, String ticketOrRegNumber, User coordinator) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event", eventId));

        if (coordinator.getRole() == Role.COORDINATOR) {
            Club coordClub = coordinator.getClub();
            if (coordClub == null || !coordClub.getId().equals(event.getClub().getId())) {
                throw new AccessDeniedException("You can only check-in attendees for your own club's events.");
            }
        }

        String search = ticketOrRegNumber.trim();
        Optional<EventRegistration> regOpt = registrationRepository.findByRegistrationNumber(search);
        if (regOpt.isEmpty()) {
            regOpt = registrationRepository.findByQrCodeData(search);
        }
        if (regOpt.isEmpty() && search.contains("REG-")) {
            // Extract REG-XXXX-XXXXX from QR JSON or combined string
            int idx = search.indexOf("REG-");
            String extracted = search.substring(idx, Math.min(search.length(), idx + 14)).replaceAll("[\"\\},;\\s]", "");
            regOpt = registrationRepository.findByRegistrationNumber(extracted);
        }

        if (regOpt.isEmpty()) {
            throw new ResourceNotFoundException("No registration found with ticket code: " + search);
        }

        EventRegistration reg = regOpt.get();
        if (!reg.getEvent().getId().equals(eventId)) {
            throw new IllegalArgumentException("Registration " + reg.getRegistrationNumber() + " belongs to '" + reg.getEvent().getTitle() + "', not this event!");
        }

        reg.setStatus(RegistrationStatus.ATTENDED);
        reg.setCheckedInAt(LocalDateTime.now());
        if (reg.getActivityPointsEarned() == null || reg.getActivityPointsEarned() == 0) {
            reg.setActivityPointsEarned(event.getEffectiveActivityPoints());
        }
        return mapToResponse(registrationRepository.save(reg));
    }

    /**
     * Aggregated registration and attendance overview for Faculty / Developer.
     */
    public List<RegistrationOverviewDTO> getOverview(User currentUser) {
        List<Event> approvedEvents = eventRepository.findByStatus(com.example.EventManager.enums.EventStatus.APPROVED);

        List<RegistrationOverviewDTO> list = new ArrayList<>();
        for (Event e : approvedEvents) {
            long total = registrationRepository.countByEvent(e);
            long confirmed = registrationRepository.countByEventAndStatus(e, RegistrationStatus.CONFIRMED);
            long waitlisted = registrationRepository.countByEventAndStatus(e, RegistrationStatus.WAITLISTED);
            long attended = registrationRepository.countByEventAndStatus(e, RegistrationStatus.ATTENDED);

            long active = confirmed + attended;
            double rate = (active > 0) ? (attended * 100.0 / active) : 0.0;

            list.add(RegistrationOverviewDTO.builder()
                    .eventId(e.getId())
                    .eventTitle(e.getTitle())
                    .eventType(e.getEventType())
                    .clubName(e.getClub() != null ? e.getClub().getName() : "Club")
                    .eventDate(e.getDate())
                    .maxCapacity(e.getMaxParticipants())
                    .totalRegistered(total)
                    .confirmed(confirmed)
                    .waitlisted(waitlisted)
                    .attended(attended)
                    .attendanceRate(Math.round(rate * 10.0) / 10.0)
                    .build());
        }
        return list;
    }

    /**
     * Student submits post-event rating (1-5 stars) and feedback comments.
     */
    @Transactional
    public RegistrationResponse submitFeedback(Long eventId, EventFeedbackRequest feedbackRequest, User student) {
        if (feedbackRequest == null || feedbackRequest.getRating() == null) {
            throw new IllegalArgumentException("Rating is required (1 to 5 stars).");
        }
        int rating = feedbackRequest.getRating();
        if (rating < 1 || rating > 5) {
            throw new IllegalArgumentException("Rating must be between 1 and 5 stars.");
        }

        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event", eventId));

        EventRegistration reg = registrationRepository.findByUserAndEvent(student, event)
                .orElseThrow(() -> new IllegalArgumentException("You are not registered for this event."));

        reg.setFeedbackRating(rating);
        reg.setFeedbackComments(feedbackRequest.getComments() != null ? feedbackRequest.getComments().trim() : "");
        reg.setFeedbackSubmittedAt(LocalDateTime.now());

        // Ensure attended status awards activity points
        if (reg.getStatus() == RegistrationStatus.ATTENDED && (reg.getActivityPointsEarned() == null || reg.getActivityPointsEarned() == 0)) {
            reg.setActivityPointsEarned(event.getEffectiveActivityPoints());
        }

        return mapToResponse(registrationRepository.save(reg));
    }

    /**
     * Coordinator / Faculty / Developer gets event analytics, turnout rate, star ratings, and student reviews.
     */
    public EventAnalyticsDTO getEventAnalytics(Long eventId, User currentUser) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event", eventId));

        if (currentUser.getRole() == Role.COORDINATOR) {
            Club coordClub = currentUser.getClub();
            if (coordClub == null || !coordClub.getId().equals(event.getClub().getId())) {
                throw new AccessDeniedException("Access denied to another club's analytics.");
            }
        }

        List<EventRegistration> registrations = registrationRepository.findByEvent(event);
        int total = registrations.size();
        int attended = 0;
        int waitlisted = 0;
        int cancelled = 0;

        Map<Integer, Integer> distribution = new LinkedHashMap<>();
        for (int i = 5; i >= 1; i--) distribution.put(i, 0);

        List<EventAnalyticsDTO.ReviewItem> reviews = new ArrayList<>();
        double ratingSum = 0;
        int ratingCount = 0;

        for (EventRegistration r : registrations) {
            if (r.getStatus() == RegistrationStatus.ATTENDED) attended++;
            else if (r.getStatus() == RegistrationStatus.WAITLISTED) waitlisted++;
            else if (r.getStatus() == RegistrationStatus.CANCELLED) cancelled++;

            if (r.getFeedbackRating() != null && r.getFeedbackRating() >= 1 && r.getFeedbackRating() <= 5) {
                int star = r.getFeedbackRating();
                distribution.put(star, distribution.getOrDefault(star, 0) + 1);
                ratingSum += star;
                ratingCount++;

                reviews.add(EventAnalyticsDTO.ReviewItem.builder()
                        .studentName(r.getStudentName() != null ? r.getStudentName() : r.getUser().getName())
                        .usn(r.getUsnOrStudentId() != null ? r.getUsnOrStudentId() : "STU-" + r.getUser().getId())
                        .department(r.getDepartment())
                        .rating(star)
                        .comments(r.getFeedbackComments())
                        .submittedAt(r.getFeedbackSubmittedAt() != null ? r.getFeedbackSubmittedAt().toString() : null)
                        .build());
            }
        }

        double turnout = (total > 0) ? Math.round((attended * 100.0 / total) * 10.0) / 10.0 : 0.0;
        double avgRating = (ratingCount > 0) ? Math.round((ratingSum / ratingCount) * 10.0) / 10.0 : 0.0;

        return EventAnalyticsDTO.builder()
                .eventId(event.getId())
                .eventTitle(event.getTitle())
                .eventType(event.getEventType() != null ? event.getEventType().name() : "EVENT")
                .clubName(event.getClub() != null ? event.getClub().getName() : "Club")
                .totalRegistrations(total)
                .totalAttended(attended)
                .totalWaitlisted(waitlisted)
                .totalCancelled(cancelled)
                .attendanceRate(turnout)
                .averageRating(avgRating)
                .totalRatingsCount(ratingCount)
                .ratingDistribution(distribution)
                .reviews(reviews)
                .build();
    }

    public RegistrationResponse mapToResponse(EventRegistration reg) {
        return RegistrationResponse.builder()
                .id(reg.getId())
                .registrationNumber(reg.getRegistrationNumber())
                .eventId(reg.getEvent().getId())
                .eventTitle(reg.getEvent().getTitle())
                .eventType(reg.getEvent().getEventType())
                .clubName(reg.getEvent().getClub() != null ? reg.getEvent().getClub().getName() : "")
                .eventDate(reg.getEvent().getDate())
                .eventTime(reg.getEvent().getStartTime() != null ? reg.getEvent().getStartTime() : reg.getEvent().getTime())
                .eventVenue(reg.getEvent().getVenue())
                .userId(reg.getUser().getId())
                .studentName(reg.getStudentName() != null ? reg.getStudentName() : reg.getUser().getName())
                .studentEmail(reg.getStudentEmail() != null ? reg.getStudentEmail() : reg.getUser().getEmail())
                .phone(reg.getPhone())
                .usnOrStudentId(reg.getUsnOrStudentId())
                .department(reg.getDepartment())
                .year(reg.getYear())
                .status(reg.getStatus())
                .registeredAt(reg.getRegisteredAt())
                .checkedInAt(reg.getCheckedInAt())
                .customData(reg.getCustomData())
                .qrCodeData(reg.getQrCodeData())
                .teamName(reg.getTeamName())
                .teamMembers(reg.getTeamMembers())
                .isTeamLead(reg.getIsTeamLead())
                .feedbackRating(reg.getFeedbackRating())
                .feedbackComments(reg.getFeedbackComments())
                .activityPointsEarned(reg.getActivityPointsEarned())
                .build();
    }
}
