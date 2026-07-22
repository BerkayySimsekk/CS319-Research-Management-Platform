
package com.halenteck.demo.dto;

import java.util.List;
import com.halenteck.demo.QuestionType;


public record CreateQuestionDTO(
        String questionText,
        QuestionType questionType,



        List<CreateOptionDTO> options
) {
}