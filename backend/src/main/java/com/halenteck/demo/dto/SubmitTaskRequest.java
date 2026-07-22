package com.halenteck.demo.dto;

import java.util.Map;

public record SubmitTaskRequest(
        String annotations,

        Double clarityA, Double relevanceA, Double accuracyA, String commentA, String highlightDataA,
        Double clarityB, Double relevanceB, Double accuracyB, String commentB, String highlightDataB,

        Double clarityC, Double relevanceC, Double accuracyC, String commentC, String highlightDataC,

        Map<Long, Double> criterionRatingsA,
        Map<Long, Double> criterionRatingsB,
        Map<Long, Double> criterionRatingsC
) {
}
