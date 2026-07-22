
package com.halenteck.demo.dto;

import com.halenteck.demo.QuestionType;
import java.util.List;


public record QuizQuestionDTO(
        Long id,
        String questionText,
        QuestionType questionType,
        List<QuizOptionDTO> options
) {
}