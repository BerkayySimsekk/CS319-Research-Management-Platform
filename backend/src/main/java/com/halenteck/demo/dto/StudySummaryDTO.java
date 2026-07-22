
package com.halenteck.demo.dto;




import com.halenteck.demo.entity.StudyStatus;
import com.halenteck.demo.permission.StudyCollaboratorRole;

import java.time.LocalDateTime;

public record StudySummaryDTO(
        Long id,
        String title,
        String description,
        boolean blinded,
        QuizSummaryDTO competencyQuiz,
        QuizSummaryDTO backgroundQuestionnaire,
        StudyCollaboratorRole currentRole,
        StudyPermissionDTO permissions,
        StudyStatus status,
        Integer latestPublishedVersion,
        int nextVersionNumber,
        boolean hasUnpublishedChanges,
        LocalDateTime accessWindowStart,
        LocalDateTime accessWindowEnd,
        String provenance,
        String creatorName
) {
}