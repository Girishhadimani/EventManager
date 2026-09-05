package com.example.EventManager.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class CertificateVerificationResponse {
    private boolean valid;
    private String certificateHash;
    private String studentName;
    private String studentEmail;
    private String usnOrStudentId;
    private String department;
    private String eventTitle;
    private String clubName;
    private String certificateType;
    private LocalDate issueDate;
    private Integer score;
    private String verificationUrl;
    private String remarks;
}
