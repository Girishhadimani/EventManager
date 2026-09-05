package com.example.EventManager.Controller;

import com.example.EventManager.dto.CodeRunRequest;
import com.example.EventManager.dto.CodeRunResponse;
import com.example.EventManager.entity.User;
import com.example.EventManager.service.CodingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/coding")
@RequiredArgsConstructor
public class CodingController {

    private final CodingService codingService;

    @GetMapping("/languages")
    public ResponseEntity<Map<String, Object>> getLanguages() {
        return ResponseEntity.ok(codingService.getSupportedLanguages());
    }

    @PostMapping("/run")
    public ResponseEntity<CodeRunResponse> runCode(
            @RequestBody CodeRunRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(codingService.executeCode(request, currentUser, false));
    }

    @PostMapping("/submit")
    public ResponseEntity<CodeRunResponse> submitCode(
            @RequestBody CodeRunRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(codingService.executeCode(request, currentUser, true));
    }
}
