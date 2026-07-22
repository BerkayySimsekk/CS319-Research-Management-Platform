
package com.halenteck.demo.dto;

import java.util.List;



public record QuizSubmitRequest(
        List<AnswerSubmitDTO> answers
) {
}