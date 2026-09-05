package com.example.EventManager.Controller;

import com.example.EventManager.service.LeaderboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/leaderboard")
@RequiredArgsConstructor
public class LeaderboardController {

    private final LeaderboardService leaderboardService;

    @GetMapping("/{eventId}")
    public ResponseEntity<List<Map<String, Object>>> getLeaderboard(@PathVariable Long eventId) {
        return ResponseEntity.ok(leaderboardService.getLeaderboardForEvent(eventId));
    }
}
