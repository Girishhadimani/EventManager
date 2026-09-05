package com.example.EventManager.service;

import com.example.EventManager.dto.ToolSubmissionRequest;
import com.example.EventManager.entity.Event;
import com.example.EventManager.entity.EventSubmission;
import com.example.EventManager.entity.User;
import com.example.EventManager.exception.ResourceNotFoundException;
import com.example.EventManager.repository.EventRepository;
import com.example.EventManager.repository.EventSubmissionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class DesignService {

    private final EventRepository eventRepository;
    private final EventSubmissionRepository submissionRepository;

    @Transactional
    public EventSubmission saveDesignSubmission(Long eventId, ToolSubmissionRequest request, User currentUser) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event", eventId));

        if (!event.isToolsOpened()) {
            throw new IllegalArgumentException("The competition tools for this event are currently locked by the coordinator. Please wait until the coordinator opens the workspace.");
        }

        EventSubmission submission = submissionRepository.findByEvent_IdAndUser_Id(eventId, currentUser.getId())
                .orElse(EventSubmission.builder()
                        .event(event)
                        .user(currentUser)
                        .submissionType("DESIGN")
                        .build());

        submission.setTitle(request.getTitle() != null ? request.getTitle() : event.getTitle() + " — Poster");
        submission.setDescription(request.getDescription() != null ? request.getDescription() : "Built using integrated Poster Studio");
        submission.setDataUrl(request.getDataUrl());
        submission.setContent(request.getContent()); // JSON canvas structure
        submission.setStatus("SUBMITTED");
        submission.setSubmittedAt(LocalDateTime.now());

        return submissionRepository.save(submission);
    }
}
