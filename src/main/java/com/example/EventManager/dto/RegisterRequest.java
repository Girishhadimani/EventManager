package com.example.EventManager.dto;

import com.example.EventManager.enums.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class RegisterRequest {

    @NotBlank(message = "Name is required")
    private String name;

    @NotBlank(message = "Email is required")
    @Email(message = "Must be a valid email")
    private String email;

    @NotBlank(message = "Password is required")
    private String password;

    private Role role; // Optional for student self-registration (defaults to USER)

    private Long clubId; // Required only for COORDINATOR role

    // ── Extended student profile fields (optional; USER role only) ─────────
    private String usn;             // e.g. "2KG21CS001"
    private String mobileNumber;    // 10-digit mobile
    private Integer yearOfStudy;    // 1–4
    private String department;      // e.g. "CSE", "ECE"
    // ────────────────────────────────────────────────────────────────────────
}
