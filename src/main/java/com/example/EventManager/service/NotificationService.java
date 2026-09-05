package com.example.EventManager.service;

import com.example.EventManager.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class NotificationService {

    public List<Map<String, Object>> getNotificationsForUser(User user) {
        List<Map<String, Object>> notifications = new ArrayList<>();

        Map<String, Object> n1 = new LinkedHashMap<>();
        n1.put("id", 1L);
        n1.put("title", "Welcome to College Events Platform");
        n1.put("message", "Explore clubs, competitions, and launch embedded event workspaces.");
        n1.put("type", "SYSTEM");
        n1.put("read", false);
        n1.put("timestamp", LocalDateTime.now().minusHours(2).toString());
        notifications.add(n1);

        Map<String, Object> n2 = new LinkedHashMap<>();
        n2.put("id", 2L);
        n2.put("title", "Competition Workspace Ready");
        n2.put("message", "Algorithm Arena 2026 and Quiz engines are live. Test your solutions now!");
        n2.put("type", "EVENT_UPDATE");
        n2.put("read", false);
        n2.put("timestamp", LocalDateTime.now().minusMinutes(30).toString());
        notifications.add(n2);

        return notifications;
    }
}
