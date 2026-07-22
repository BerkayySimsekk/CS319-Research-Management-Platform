
package com.halenteck.demo.dto;

import java.util.Map;





public record ParticipantWithScoresDTO(
        Long id,
        String name,
        String email,
        String skills,
        Integer yearsOfExperience,

        Map<Long, Double> quizScores,

        Map<Long, String> questionnaireAnswers
) {
}

