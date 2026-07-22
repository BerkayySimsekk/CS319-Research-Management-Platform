
package com.halenteck.demo.dto;

import java.util.Map;




public record ParticipantFilterRequestDTO(

        Map<Long, Double> minQuizScores,

        Map<Long, String> questionnaireAnswers,

        String experienceLevel,

        Integer minYearsOfExperience,

        String skills
) {
}

