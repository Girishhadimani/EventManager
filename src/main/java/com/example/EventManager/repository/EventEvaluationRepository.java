package com.example.EventManager.repository;

import com.example.EventManager.entity.EventEvaluation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EventEvaluationRepository extends JpaRepository<EventEvaluation, Long> {
    List<EventEvaluation> findBySubmission_Id(Long submissionId);
}
