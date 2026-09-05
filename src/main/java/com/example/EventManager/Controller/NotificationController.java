package com.example.EventManager.Controller;

import com.example.EventManager.entity.User;
import com.example.EventManager.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getMyNotifications(
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(notificationService.getNotificationsForUser(currentUser));
    }
}
