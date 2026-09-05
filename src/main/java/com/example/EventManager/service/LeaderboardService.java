package com.example.EventManager.service;

import com.example.EventManager.entity.EventSubmission;
import com.example.EventManager.repository.EventSubmissionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class LeaderboardService {

    private final EventSubmissionRepository submissionRepository;

    public List<Map<String, Object>> getLeaderboardForEvent(Long eventId) {
        List<EventSubmission> list = submissionRepository.findByEvent_IdOrderByScoreDescSubmittedAtAsc(eventId);
        List<Map<String, Object>> board = new ArrayList<>();

        int rank = 1;
        for (EventSubmission s : list) {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("rank", rank++);
            entry.put("submissionId", s.getId());
            entry.put("participantName", s.getUser().getName());
            entry.put("participantEmail", s.getUser().getEmail());
            entry.put("teamName", s.getTeamName() != null ? s.getTeamName() : s.getUser().getName());
            entry.put("submissionType", s.getSubmissionType());
            entry.put("title", s.getTitle());
            entry.put("score", s.getScore());
            entry.put("status", s.getStatus());
            entry.put("submittedAt", s.getSubmittedAt());
            board.add(entry);
        }

        return board;
    }
}
