
package com.halenteck.demo.dto;


public record QuizEditOptionDTO(
        Long id,
        String optionText,
        boolean isCorrect
) {
}

