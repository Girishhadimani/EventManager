package com.example.EventManager.enums;

public enum EventStatus {
    DRAFT,
    PENDING,                 // Backward-compatible alias
    PENDING_APPROVAL,        // Coordinator created — awaiting Faculty Coordinator approval
    APPROVED,                // Faculty Coordinator approved
    PUBLISHED,               // Live on public hub
    REGISTRATION_OPEN,       // Accepting registrations
    REGISTRATION_CLOSED,     // Deadline reached or capacity full
    ONGOING,                 // Event day active (check-in station open)
    COMPLETED,               // Event has concluded
    RESULTS_PUBLISHED,       // Leaderboards and judging locked
    CERTIFICATES_GENERATED,  // Verifiable certificates issued
    REJECTED,                // Faculty Coordinator rejected — coordinator sees reason
    CANCELLED                // Cancelled
}