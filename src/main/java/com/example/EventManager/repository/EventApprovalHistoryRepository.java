package com.example.EventManager.repository;

import com.example.EventManager.entity.Event;
import com.example.EventManager.entity.EventApprovalHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EventApprovalHistoryRepository extends JpaRepository<EventApprovalHistory, Long> {
    List<EventApprovalHistory> findByEventOrderByCreatedAtDesc(Event event);
    List<EventApprovalHistory> findByEventIdOrderByCreatedAtDesc(Long eventId);
}
