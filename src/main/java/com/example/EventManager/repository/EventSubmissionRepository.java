package com.example.EventManager.repository;

import com.example.EventManager.entity.Event;
import com.example.EventManager.entity.EventSubmission;
import com.example.EventManager.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EventSubmissionRepository extends JpaRepository<EventSubmission, Long> {
    List<EventSubmission> findByEvent_Id(Long eventId);
    List<EventSubmission> findByEvent_IdOrderByScoreDescSubmittedAtAsc(Long eventId);
    List<EventSubmission> findByUser_Id(Long userId);
    Optional<EventSubmission> findByEventAndUser(Event event, User user);
    Optional<EventSubmission> findByEvent_IdAndUser_Id(Long eventId, Long userId);
}
