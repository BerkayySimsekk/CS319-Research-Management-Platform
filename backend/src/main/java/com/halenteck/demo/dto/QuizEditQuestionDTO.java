
package com.halenteck.demo.dto;

import com.halenteck.demo.QuestionType;
import java.util.List;


public record QuizEditQuestionDTO(
        Long id,
        String questionText,
        QuestionType questionType,
        List<QuizEditOptionDTO> options
) {
}

