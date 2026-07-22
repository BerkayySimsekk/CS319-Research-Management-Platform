package com.halenteck.demo.dto;

import com.halenteck.demo.entity.StudyInviteDeliveryMethod;
import com.halenteck.demo.entity.StudyInviteStatus;

import java.time.LocalDateTime;

public record ParticipantInviteDTO(
        Long inviteId,
        Long studyId,
        String studyTitle,
        String studyDescription,
        String token,
        StudyInviteStatus status,
        StudyInviteDeliveryMethod deliveryMethod,
        LocalDateTime expiresAt,
        LocalDateTime createdAt,
        Long quizId,
        boolean quizCompleted,
        Long questionnaireId,
        boolean questionnaireCompleted
) {
}

