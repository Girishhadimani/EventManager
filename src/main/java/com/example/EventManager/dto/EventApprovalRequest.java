package com.example.EventManager.dto;

import lombok.Data;

@Data
public class EventApprovalRequest {
    private String rejectionReason; // Required only for rejection
}
