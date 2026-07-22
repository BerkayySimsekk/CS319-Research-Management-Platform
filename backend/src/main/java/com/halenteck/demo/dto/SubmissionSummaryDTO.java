
package com.halenteck.demo.dto;

import java.time.LocalDateTime;






public record SubmissionSummaryDTO(
        Long submissionId,
        Long participantId,
        String participantName,
        Double score,
        LocalDateTime submittedAt
) {
}