package com.halenteck.demo.dto;

import java.time.LocalDateTime;

public record ReviewerNoteDTO(
        Long id,
        Long studyId,
        Long reviewerId,
        String reviewerName,
        String comment,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}

