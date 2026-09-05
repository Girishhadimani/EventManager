package com.example.EventManager.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class LoginResponse {

    private String token;
    private String role;
    private Long userId;
    private String name;
    private String email;
    private Long clubId;       // Only relevant for COORDINATOR
    private String clubName;   // Only relevant for COORDINATOR
}
