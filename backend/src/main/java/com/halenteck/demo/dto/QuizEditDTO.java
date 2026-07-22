
package com.halenteck.demo.dto;

import com.halenteck.demo.QuizType;
import java.util.List;


public record QuizEditDTO(
        Long quizId,
        String title,
        String description,
        Integer durationInMinutes,
        QuizType type,
        List<QuizEditQuestionDTO> questions
) {
}

