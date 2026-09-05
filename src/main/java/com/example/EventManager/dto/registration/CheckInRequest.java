package com.example.EventManager.dto.registration;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CheckInRequest {
    // Can be either the human-readable registrationNumber (e.g. REG-2026-00182) or raw QR payload
    private String ticketOrRegNumber;
}
