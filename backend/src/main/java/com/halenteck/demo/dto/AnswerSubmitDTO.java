
package com.halenteck.demo.dto;



public record AnswerSubmitDTO(
        Long questionId,
        Long selectedOptionId,
        String answerText
) {
}