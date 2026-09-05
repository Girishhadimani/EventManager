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
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class SubmissionService {

    private final EventRepository eventRepository;
    private final EventSubmissionRepository submissionRepository;

    @Transactional
    public EventSubmission createOrUpdateSubmission(Long eventId, ToolSubmissionRequest request, User currentUser) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event", eventId));

        EventSubmission submission = submissionRepository.findByEvent_IdAndUser_Id(eventId, currentUser.getId())
                .orElse(EventSubmission.builder()
                        .event(event)
                        .user(currentUser)
                        .build());

        submission.setSubmissionType(request.getSubmissionType() != null ? request.getSubmissionType() : "PROJECT");
        submission.setTitle(request.getTitle() != null ? request.getTitle() : event.getTitle() + " Entry");
        submission.setDescription(request.getDescription());
        submission.setContent(request.getContent());
        submission.setDataUrl(request.getDataUrl());
        submission.setGithubUrl(request.getGithubUrl());
        submission.setDemoUrl(request.getDemoUrl());
        submission.setVideoUrl(request.getVideoUrl());
        submission.setTeamName(request.getTeamName());
        submission.setTeamMembers(request.getTeamMembers());
        submission.setStatus("SUBMITTED");
        submission.setSubmittedAt(LocalDateTime.now());

        return submissionRepository.save(submission);
    }

    public List<EventSubmission> getSubmissionsByEvent(Long eventId) {
        return submissionRepository.findByEvent_Id(eventId);
    }

    public Optional<EventSubmission> getSubmissionById(Long id) {
        return submissionRepository.findById(id);
    }

    public Optional<EventSubmission> getMySubmission(Long eventId, Long userId) {
        return submissionRepository.findByEvent_IdAndUser_Id(eventId, userId);
    }
}
