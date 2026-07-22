package com.halenteck.demo.dto;

import java.time.LocalDateTime;




public record ReviewerEvaluationDTO(
        Long taskId,
        Long participantId,
        String participantName,
        String taskTitle,
        LocalDateTime completedAt,
        Integer timeSpentMinutes,
        Integer consistencyScore,
        String detailLevel,
        Boolean flagged
) {
}

