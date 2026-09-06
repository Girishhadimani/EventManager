package com.example.EventManager.repository;

import com.example.EventManager.entity.Event;
import com.example.EventManager.enums.EventStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EventRepository extends JpaRepository<Event, Long> {

    // All events for a specific club
    List<Event> findByClub_Id(Long clubId);

    // All events for a specific club ordered by date desc
    List<Event> findByClub_IdOrderByDateDesc(Long clubId);

    // All events by status (used by Faculty Coordinator for pending queue)
    List<Event> findByStatus(EventStatus status);

    // Events for a club with a specific status
    List<Event> findByClub_IdAndStatus(Long clubId, EventStatus status);

    // Events visible to students — only APPROVED
    List<Event> findByStatusOrderByDateAsc(EventStatus status);

    // Events matching any of the given statuses
    List<Event> findByStatusInOrderByDateAsc(List<EventStatus> statuses);

    // Venue & Schedule conflict lookup
    List<Event> findByDateAndVenue(java.time.LocalDate date, String venue);

    // Upcoming events for reminders
    List<Event> findByDateAndStatus(java.time.LocalDate date, EventStatus status);
}

