package com.example.EventManager.service;

import com.example.EventManager.entity.Event;
import com.example.EventManager.entity.User;
import com.example.EventManager.enums.EventStatus;
import com.example.EventManager.exception.ResourceNotFoundException;
import com.example.EventManager.repository.EventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class EventApprovalService {

    private final EventRepository eventRepository;

    @Transactional
    public Event approveEvent(Long eventId, User reviewer) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event", eventId));

        if (event.getStatus() != EventStatus.PENDING) {
            throw new IllegalArgumentException(
                    "Only PENDING events can be approved. Current status: " + event.getStatus());
        }

        event.setStatus(EventStatus.APPROVED);
        event.setReviewedBy(reviewer);
        event.setRejectionReason(null);
        return eventRepository.save(event);
    }

    @Transactional
    public Event rejectEvent(Long eventId, String reason, User reviewer) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event", eventId));

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
        return eventRepository.save(event);
    }
}
