package com.example.EventManager.service;

import com.example.EventManager.dto.ConflictCheckRequest;
import com.example.EventManager.dto.ConflictCheckResponse;
import com.example.EventManager.dto.EventRequest;
import com.example.EventManager.entity.Club;
import com.example.EventManager.entity.Event;
import com.example.EventManager.entity.EventApprovalHistory;
import com.example.EventManager.entity.User;
import com.example.EventManager.enums.EventStatus;
import com.example.EventManager.enums.Role;
import com.example.EventManager.exception.ResourceNotFoundException;
import com.example.EventManager.exception.UnauthorizedException;
import com.example.EventManager.repository.ClubRepository;
import com.example.EventManager.repository.EventApprovalHistoryRepository;
import com.example.EventManager.repository.EventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import com.example.EventManager.dto.ToolsStatusResponse;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Arrays;
import java.util.List;

@Service
@RequiredArgsConstructor
public class EventService {

    private final EventRepository eventRepository;
    private final ClubRepository clubRepository;
    private final ToolService toolService;
    private final EventApprovalHistoryRepository approvalHistoryRepository;

    // ---- Read ----

    public List<Event> getAllEvents() {
        return eventRepository.findAll();
    }

    /**
     * Active & approved events visible to students & public hub.
     */
    public List<Event> getApprovedEvents() {
        return eventRepository.findByStatusInOrderByDateAsc(Arrays.asList(
                EventStatus.APPROVED,
                EventStatus.PUBLISHED,
                EventStatus.REGISTRATION_OPEN,
                EventStatus.REGISTRATION_CLOSED,
                EventStatus.ONGOING,
                EventStatus.COMPLETED,
                EventStatus.RESULTS_PUBLISHED,
                EventStatus.CERTIFICATES_GENERATED
        ));
    }

    public List<Event> getEventsByClub(Long clubId) {
        return eventRepository.findByClub_IdOrderByDateDesc(clubId);
    }

    /**
     * PENDING events queue — for Faculty Coordinator dashboard.
     */
    public List<Event> getPendingEvents() {
        return eventRepository.findByStatus(EventStatus.PENDING);
    }

    public Event getEventById(Long id) {
        return eventRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Event", id));
    }

    // ---- Venue Conflict Detection ----

    public ConflictCheckResponse checkConflict(ConflictCheckRequest request) {
        if (request.getDate() == null || request.getVenue() == null || request.getVenue().isBlank()) {
            return ConflictCheckResponse.builder().hasConflict(false).build();
        }

        String venue = request.getVenue().trim();
        // Skip conflict checks for online / virtual events
        String vLower = venue.toLowerCase();
        if (vLower.contains("online") || vLower.contains("virtual") || vLower.contains("zoom") || vLower.contains("meet")) {
            return ConflictCheckResponse.builder().hasConflict(false).build();
        }

        LocalTime reqStart = request.getStartTime();
        LocalTime reqEnd = request.getEndTime() != null ? request.getEndTime() : (reqStart != null ? reqStart.plusHours(2) : null);

        List<Event> existingEvents = eventRepository.findByDateAndVenue(request.getDate(), venue);

        for (Event existing : existingEvents) {
            // Exclude the event itself when updating
            if (request.getExcludeEventId() != null && existing.getId().equals(request.getExcludeEventId())) {
                continue;
            }
            // Ignore rejected or cancelled events
            if (existing.getStatus() == EventStatus.REJECTED || existing.getStatus() == EventStatus.CANCELLED) {
                continue;
            }

            LocalTime exStart = existing.getStartTime() != null ? existing.getStartTime() : existing.getTime();
            LocalTime exEnd = existing.getEndTime() != null ? existing.getEndTime() : (exStart != null ? exStart.plusHours(2) : null);

            boolean overlap = false;
            if (reqStart != null && reqEnd != null && exStart != null && exEnd != null) {
                overlap = reqStart.isBefore(exEnd) && exStart.isBefore(reqEnd);
            } else {
                // If times are not specified, same venue on same date is deemed conflicting
                overlap = true;
            }

            if (overlap) {
                String clubName = existing.getClub() != null ? existing.getClub().getName() : "College Club";
                String timeRange = (exStart != null ? exStart.toString() : "TBD") + " - " + (exEnd != null ? exEnd.toString() : "TBD");
                return ConflictCheckResponse.builder()
                        .hasConflict(true)
                        .conflictReason("Venue '" + venue + "' is already reserved by '" + existing.getTitle() + "' (" + clubName + ") during " + timeRange)
                        .conflictingEventId(existing.getId())
                        .conflictingEventTitle(existing.getTitle())
                        .conflictingClubName(clubName)
                        .conflictingTimeRange(timeRange)
                        .build();
            }
        }

        return ConflictCheckResponse.builder().hasConflict(false).build();
    }

    // ---- Create (starts as PENDING) ----

    /**
     * Coordinator creates an event → status = PENDING (needs Faculty Coordinator approval).
     * Developer-created events are APPROVED immediately.
     */
    public Event createEvent(EventRequest request, User creator) {
        Long targetClubId = request.getClubId();
        if (targetClubId == null && creator.getClub() != null) {
            targetClubId = creator.getClub().getId();
        }
        if (targetClubId == null) {
            throw new IllegalArgumentException("Club ID is required to create an event.");
        }

        final Long resolvedClubId = targetClubId;
        Club club = clubRepository.findById(resolvedClubId)
                .orElseThrow(() -> new ResourceNotFoundException("Club", resolvedClubId));

        // COORDINATOR can only create events for their own club (Level 2 auth)
        if (creator.getRole() == Role.COORDINATOR) {
            assertCoordinatorOwnsClub(creator, club.getId());
        }

        // Validate venue conflicts
        ConflictCheckRequest conflictReq = new ConflictCheckRequest();
        conflictReq.setDate(request.getDate());
        conflictReq.setStartTime(request.getStartTime() != null ? request.getStartTime() : request.getTime());
        conflictReq.setEndTime(request.getEndTime());
        conflictReq.setVenue(request.getVenue());
        ConflictCheckResponse conflictResp = checkConflict(conflictReq);
        if (conflictResp.isHasConflict()) {
            throw new IllegalArgumentException("Venue conflict detected: " + conflictResp.getConflictReason());
        }

        // Determine initial status:
        // - DEVELOPER → APPROVED immediately (admin bypass)
        // - COORDINATOR / FACULTY_COORDINATOR → PENDING (needs approval)
        EventStatus initialStatus = (creator.getRole() == Role.DEVELOPER)
                ? EventStatus.APPROVED
                : EventStatus.PENDING;

        com.example.EventManager.enums.EventType eventType = (request.getEventType() != null)
                ? request.getEventType()
                : com.example.EventManager.enums.EventType.OTHER;

        java.util.Set<com.example.EventManager.enums.ToolType> tools = (request.getTools() != null && !request.getTools().isEmpty())
                ? request.getTools()
                : toolService.getDefaultToolsForEventType(eventType);

        Event event = Event.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .date(request.getDate())
                .time(request.getTime() != null ? request.getTime() : request.getStartTime())
                .startTime(request.getStartTime() != null ? request.getStartTime() : request.getTime())
                .endTime(request.getEndTime())
                .venue(request.getVenue())
                .eventType(eventType)
                .tools(new java.util.HashSet<>(tools))
                .toolConfig(request.getToolConfig())
                .maxParticipants(request.getMaxParticipants() != null ? request.getMaxParticipants() : 100)
                .registrationDeadline(request.getRegistrationDeadline())
                .registrationFormSchema(request.getRegistrationFormSchema())
                .club(club)
                .createdBy(creator)
                .status(initialStatus)
                .build();

        Event saved = eventRepository.save(event);

        // Record initial history
        approvalHistoryRepository.save(EventApprovalHistory.builder()
                .event(saved)
                .action("CREATED")
                .performedBy(creator)
                .comment("Event submitted with status: " + initialStatus)
                .build());

        return saved;
    }

    // ---- Update ----

    /**
     * Coordinator/Faculty edit an event.
     * If a REJECTED event is re-submitted, it goes back to PENDING.
     */
    public Event updateEvent(Long eventId, EventRequest request, User editor) {
        Event event = getEventById(eventId);

        if (editor.getRole() == Role.COORDINATOR) {
            assertCoordinatorOwnsClub(editor, event.getClub().getId());
        }

        Long targetClubId = request.getClubId();
        if (targetClubId == null && event.getClub() != null) {
            targetClubId = event.getClub().getId();
        } else if (targetClubId == null && editor.getClub() != null) {
            targetClubId = editor.getClub().getId();
        }

        if (targetClubId != null) {
            final Long resolvedClubId = targetClubId;
            Club club = clubRepository.findById(resolvedClubId)
                    .orElseThrow(() -> new ResourceNotFoundException("Club", resolvedClubId));
            event.setClub(club);
        }

        // Validate venue conflict on update
        ConflictCheckRequest conflictReq = new ConflictCheckRequest();
        conflictReq.setDate(request.getDate() != null ? request.getDate() : event.getDate());
        conflictReq.setStartTime(request.getStartTime() != null ? request.getStartTime() : request.getTime());
        conflictReq.setEndTime(request.getEndTime());
        conflictReq.setVenue(request.getVenue() != null ? request.getVenue() : event.getVenue());
        conflictReq.setExcludeEventId(eventId);
        ConflictCheckResponse conflictResp = checkConflict(conflictReq);
        if (conflictResp.isHasConflict()) {
            throw new IllegalArgumentException("Venue conflict detected: " + conflictResp.getConflictReason());
        }

        event.setTitle(request.getTitle());
        event.setDescription(request.getDescription());
        event.setDate(request.getDate());
        event.setTime(request.getTime() != null ? request.getTime() : request.getStartTime());
        event.setStartTime(request.getStartTime() != null ? request.getStartTime() : event.getStartTime());
        event.setEndTime(request.getEndTime() != null ? request.getEndTime() : event.getEndTime());
        event.setVenue(request.getVenue());

        if (request.getEventType() != null) {
            event.setEventType(request.getEventType());
        }
        if (request.getTools() != null && !request.getTools().isEmpty()) {
            event.setTools(new java.util.HashSet<>(request.getTools()));
        }
        if (request.getToolConfig() != null) {
            event.setToolConfig(request.getToolConfig());
        }
        if (request.getMaxParticipants() != null) {
            event.setMaxParticipants(request.getMaxParticipants());
        }
        if (request.getRegistrationDeadline() != null) {
            event.setRegistrationDeadline(request.getRegistrationDeadline());
        }
        if (request.getRegistrationFormSchema() != null) {
            event.setRegistrationFormSchema(request.getRegistrationFormSchema());
        }

        boolean wasRejected = (event.getStatus() == EventStatus.REJECTED);
        // If a rejected event is edited → resubmit to PENDING for re-review
        if (wasRejected) {
            event.setStatus(EventStatus.PENDING);
            event.setRejectionReason(null);
            event.setReviewedBy(null);
        }

        Event saved = eventRepository.save(event);

        approvalHistoryRepository.save(EventApprovalHistory.builder()
                .event(saved)
                .action(wasRejected ? "RESUBMITTED" : "UPDATED")
                .performedBy(editor)
                .comment(wasRejected ? "Event revised and resubmitted for faculty approval" : "Event details updated")
                .build());

        return saved;
    }

    // ---- Lifecycle State Transitions ----

    public Event updateEventStatus(Long eventId, EventStatus newStatus, User user) {
        Event event = getEventById(eventId);

        if (user.getRole() == Role.COORDINATOR) {
            assertCoordinatorOwnsClub(user, event.getClub().getId());
        }

        EventStatus oldStatus = event.getStatus();
        event.setStatus(newStatus);
        Event saved = eventRepository.save(event);

        approvalHistoryRepository.save(EventApprovalHistory.builder()
                .event(saved)
                .action("STATUS_CHANGED")
                .performedBy(user)
                .comment("Status transitioned from " + oldStatus + " to " + newStatus)
                .build());

        return saved;
    }

    // ---- Faculty Coordinator: Approve / Reject ----

    /**
     * FACULTY_COORDINATOR approves a PENDING event.
     * Event becomes APPROVED → visible to students.
     */
    public Event approveEvent(Long eventId, User reviewer) {
        Event event = getEventById(eventId);

        if (event.getStatus() != EventStatus.PENDING) {
            throw new IllegalArgumentException(
                    "Only PENDING events can be approved. Current status: " + event.getStatus());
        }

        event.setStatus(EventStatus.APPROVED);
        event.setReviewedBy(reviewer);
        event.setRejectionReason(null);
        Event saved = eventRepository.save(event);

        approvalHistoryRepository.save(EventApprovalHistory.builder()
                .event(saved)
                .action("APPROVED")
                .performedBy(reviewer)
                .comment("Approved by Faculty Coordinator")
                .build());

        return saved;
    }

    /**
     * FACULTY_COORDINATOR rejects a PENDING event with a reason.
     * Coordinator sees the reason and can edit + resubmit.
     */
    public Event rejectEvent(Long eventId, String reason, User reviewer) {
        Event event = getEventById(eventId);

        if (event.getStatus() != EventStatus.PENDING) {
            throw new IllegalArgumentException(
                    "Only PENDING events can be rejected. Current status: " + event.getStatus());
        }

        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("A rejection reason is required.");
        }

        event.setStatus(EventStatus.REJECTED);
        event.setRejectionReason(reason);
        event.setReviewedBy(reviewer);
        Event saved = eventRepository.save(event);

        approvalHistoryRepository.save(EventApprovalHistory.builder()
                .event(saved)
                .action("REJECTED")
                .performedBy(reviewer)
                .comment("Reason: " + reason)
                .build());

        return saved;
    }

    // ---- History ----

    public List<EventApprovalHistory> getApprovalHistory(Long eventId) {
        // Ensure event exists
        getEventById(eventId);
        return approvalHistoryRepository.findByEventIdOrderByCreatedAtDesc(eventId);
    }

    // ---- Cancel / Delete ----

    public Event cancelEvent(Long eventId, User editor) {
        Event event = getEventById(eventId);

        if (editor.getRole() == Role.COORDINATOR) {
            assertCoordinatorOwnsClub(editor, event.getClub().getId());
        }

        event.setStatus(EventStatus.CANCELLED);
        Event saved = eventRepository.save(event);

        approvalHistoryRepository.save(EventApprovalHistory.builder()
                .event(saved)
                .action("CANCELLED")
                .performedBy(editor)
                .comment("Event cancelled")
                .build());

        return saved;
    }

    // ---- Tool Gating Engine ----

    public Event toggleToolsAccess(Long eventId, boolean open, User coordinator) {
        Event event = getEventById(eventId);

        if (coordinator.getRole() == Role.COORDINATOR) {
            assertCoordinatorOwnsClub(coordinator, event.getClub().getId());
        }

        event.setToolsOpened(open);
        if (open) {
            event.setToolsOpenedAt(LocalDateTime.now());
            if (event.getStatus() == EventStatus.APPROVED || 
                event.getStatus() == EventStatus.REGISTRATION_OPEN || 
                event.getStatus() == EventStatus.REGISTRATION_CLOSED) {
                event.setStatus(EventStatus.ONGOING);
            }
        } else {
            event.setToolsClosedAt(LocalDateTime.now());
        }

        Event saved = eventRepository.save(event);

        approvalHistoryRepository.save(EventApprovalHistory.builder()
                .event(saved)
                .action(open ? "TOOLS_OPENED" : "TOOLS_LOCKED")
                .performedBy(coordinator)
                .comment(open ? "Tool workspace officially opened for participants" : "Tool workspace locked by coordinator")
                .build());

        return saved;
    }

    public ToolsStatusResponse getToolsStatus(Long eventId) {
        Event event = getEventById(eventId);
        LocalTime start = event.getStartTime() != null ? event.getStartTime() : event.getTime();

        return ToolsStatusResponse.builder()
                .eventId(event.getId())
                .eventTitle(event.getTitle())
                .clubName(event.getClub() != null ? event.getClub().getName() : "KLS GIT Student Club")
                .toolsOpened(event.isToolsOpened())
                .status(event.getStatus() != null ? event.getStatus().name() : "APPROVED")
                .date(event.getDate())
                .startTime(start)
                .endTime(event.getEndTime())
                .serverTime(LocalDateTime.now())
                .message(event.isToolsOpened() 
                        ? "Competition tools are live and accessible." 
                        : "Competition tools are locked until opened by the coordinator.")
                .build();
    }

    public void deleteEvent(Long eventId) {
        Event event = getEventById(eventId);
        eventRepository.delete(event);
    }

    // ---- Level-2 Resource Authorization ----

    /**
     * Ensures COORDINATOR can only modify events of their own assigned club.
     */
    private void assertCoordinatorOwnsClub(User coordinator, Long eventClubId) {
        if (coordinator.getClub() == null ||
                !coordinator.getClub().getId().equals(eventClubId)) {
            throw new UnauthorizedException(
                    "You are not authorized to manage events for this club. " +
                            "Your assigned club: " +
                            (coordinator.getClub() != null ? coordinator.getClub().getName() : "none"));
        }
    }
}

