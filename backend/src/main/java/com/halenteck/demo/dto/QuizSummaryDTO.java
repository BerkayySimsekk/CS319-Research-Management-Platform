
package com.halenteck.demo.dto;

import com.halenteck.demo.QuizType;
import java.time.LocalDateTime;






public record QuizSummaryDTO(
        Long id,
        String title,
        String description,
        Integer durationInMinutes,
        LocalDateTime createdAt,
        int questionCount,
        QuizType type
) {
}