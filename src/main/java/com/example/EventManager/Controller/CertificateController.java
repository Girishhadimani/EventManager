package com.example.EventManager.Controller;

import com.example.EventManager.entity.User;
import com.example.EventManager.service.CertificateService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/certificates")
@RequiredArgsConstructor
public class CertificateController {

    private final CertificateService certificateService;

    @GetMapping("/event/{eventId}")
    public ResponseEntity<Map<String, Object>> getCertificate(
            @PathVariable Long eventId,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(certificateService.generateCertificate(eventId, currentUser));
    }

    @GetMapping("/my")
    public ResponseEntity<List<Map<String, Object>>> getMyCertificates(
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(certificateService.getMyCertificates(currentUser));
    }

    @GetMapping("/verify/{hash}")
    public ResponseEntity<com.example.EventManager.dto.CertificateVerificationResponse> verifyCertificate(
            @PathVariable String hash) {
        return ResponseEntity.ok(certificateService.verifyCertificate(hash));
    }

    @GetMapping("/vtu-activity-points")
    public ResponseEntity<com.example.EventManager.dto.VtuActivityPointsDTO> getVtuActivityPoints(
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(certificateService.getVtuActivityPointsSummary(currentUser));
    }
}
