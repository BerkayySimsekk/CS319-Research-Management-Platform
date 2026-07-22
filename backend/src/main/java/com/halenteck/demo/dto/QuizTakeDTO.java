
package com.halenteck.demo.dto;

import java.util.List;



public record QuizTakeDTO(
        Long quizId,
        String title,
        String description,
        Integer durationInMinutes,
        List<QuizQuestionDTO> questions
) {
}