
package com.halenteck.demo.dto;

import java.util.List;
import com.halenteck.demo.QuizType;

public record CreateQuizRequest(
        String title,
        String description,
        Integer durationInMinutes,
        QuizType type,
        List<CreateQuestionDTO> questions
) {
}