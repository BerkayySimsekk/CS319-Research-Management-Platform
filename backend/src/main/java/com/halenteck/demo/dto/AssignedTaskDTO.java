

package com.halenteck.demo.dto;

import com.halenteck.demo.entity.ComparisonTaskEntity;
import java.time.LocalDateTime;






public record AssignedTaskDTO(
        Long taskId,
        Long participantId,
        String participantName,
        Long artifactAId,
        String artifactAFileName,
        Long artifactBId,
        String artifactBFileName,
        ComparisonTaskEntity.TaskStatus status,
        LocalDateTime createdAt,
        LocalDateTime completedAt,
        Integer studyVersionNumber,
        String description,
        Boolean reviewed
) {
}