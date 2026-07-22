package com.halenteck.demo.dto;

import java.time.LocalDateTime;
import com.halenteck.demo.entity.ComparisonTaskEntity;

public record TaskResponseDTO(
        Long taskId,
        Long studyId,
        String studyTitle,
        String studyDescription,
        boolean blinded,
        ComparisonTaskEntity.TaskStatus status,
        LocalDateTime createdAt,
        ArtifactSummaryDTO artifactA,
        ArtifactSummaryDTO artifactB,
        ArtifactSummaryDTO artifactC
) {
}
