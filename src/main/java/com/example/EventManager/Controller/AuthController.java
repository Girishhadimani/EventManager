package com.example.EventManager.Controller;

import com.example.EventManager.dto.LoginRequest;
import com.example.EventManager.dto.LoginResponse;
import com.example.EventManager.dto.RegisterRequest;
import com.example.EventManager.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /**
     * Single login endpoint for ALL roles.
     * Returns JWT + role — frontend decides which dashboard to show.
     */
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    /**
     * Register a new user (called by DEVELOPER or first-time setup).
     */
    @PostMapping("/register")
    public ResponseEntity<LoginResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    /**
     * Send email verification OTP
     */
    @PostMapping("/send-otp")
    public ResponseEntity<java.util.Map<String, Object>> sendOtp(@Valid @RequestBody com.example.EventManager.dto.OtpRequest request) {
        return ResponseEntity.ok(authService.sendOtp(request.getEmail()));
    }

    /**
     * Verify email OTP
     */
    @PostMapping("/verify-otp")
    public ResponseEntity<java.util.Map<String, Object>> verifyOtp(@Valid @RequestBody com.example.EventManager.dto.OtpVerifyRequest request) {
        return ResponseEntity.ok(authService.verifyOtp(request.getEmail(), request.getOtp()));
    }

    /**
     * Student self-registration with USN, mobile, email, year, department.
     * Automatically assigns ROLE_USER.
     */
    @PostMapping("/register-student")
    public ResponseEntity<LoginResponse> registerStudent(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.registerStudent(request));
    }

    /**
     * Current authenticated user profile
     */
    @GetMapping("/me")
    public ResponseEntity<LoginResponse> getCurrentUser(
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.example.EventManager.entity.User currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(LoginResponse.builder()
                .userId(currentUser.getId())
                .name(currentUser.getName())
                .email(currentUser.getEmail())
                .role(currentUser.getRole().name())
                .clubId(currentUser.getClub() != null ? currentUser.getClub().getId() : null)
                .clubName(currentUser.getClub() != null ? currentUser.getClub().getName() : null)
                .build());
    }
}


