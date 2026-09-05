package com.example.EventManager.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ConflictCheckResponse {
    private boolean hasConflict;
    private String conflictReason;
    private Long conflictingEventId;
    private String conflictingEventTitle;
    private String conflictingClubName;
    private String conflictingTimeRange;
}
