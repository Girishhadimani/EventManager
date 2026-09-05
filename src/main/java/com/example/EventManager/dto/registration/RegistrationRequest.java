package com.example.EventManager.dto.registration;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RegistrationRequest {
    private String phone;
    private String usnOrStudentId;
    private String department;
    private String year;

    // JSON string containing event-type specific details
    private String customData;

    // Team / Group Registration
    private String teamName;
    private String teamMembers;
}
