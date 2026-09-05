package com.example.EventManager.service;

import com.example.EventManager.dto.JudgeEvaluationRequest;
import com.example.EventManager.entity.EventEvaluation;
import com.example.EventManager.entity.EventSubmission;
import com.example.EventManager.entity.User;
import com.example.EventManager.exception.ResourceNotFoundException;
import com.example.EventManager.repository.EventEvaluationRepository;
import com.example.EventManager.repository.EventSubmissionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class EvaluationService {

    private final EventSubmissionRepository submissionRepository;
    private final EventEvaluationRepository evaluationRepository;

    @Transactional
    public EventSubmission evaluate(Long submissionId, JudgeEvaluationRequest request, User reviewer) {
        EventSubmission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Submission", submissionId));

        int total = request.getInnovationScore()
                + request.getTechnicalScore()
                + request.getUiScore()
                + request.getImpactScore()
                + request.getPresentationScore()
                + request.getDemoScore();

        EventEvaluation eval = EventEvaluation.builder()
                .submission(submission)
                .reviewer(reviewer)
                .innovationScore(request.getInnovationScore())
                .technicalScore(request.getTechnicalScore())
                .uiScore(request.getUiScore())
                .impactScore(request.getImpactScore())
                .presentationScore(request.getPresentationScore())
                .demoScore(request.getDemoScore())
                .totalScore(total)
                .remarks(request.getRemarks())
                .evaluatedAt(LocalDateTime.now())
                .build();

        evaluationRepository.save(eval);

        submission.setScore(total);
        submission.setStatus(total >= 80 ? "WINNER" : "EVALUATED");
        submission.setJudgeRemarks(request.getRemarks());
        submission.setReviewedBy(reviewer);
        submission.setEvaluatedAt(LocalDateTime.now());

        return submissionRepository.save(submission);
    }

    public List<EventEvaluation> getEvaluationsForSubmission(Long submissionId) {
        return evaluationRepository.findBySubmission_Id(submissionId);
    }
}
