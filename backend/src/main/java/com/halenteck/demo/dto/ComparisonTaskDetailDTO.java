package com.halenteck.demo.dto;

import com.halenteck.demo.entity.ComparisonTaskEntity;
import com.halenteck.demo.entity.TaskCriterionRatingEntity;
import com.halenteck.demo.entity.UserEntity;
import com.halenteck.demo.repository.TaskCriterionRatingRepository;
import com.halenteck.demo.repository.UserRepository;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public record ComparisonTaskDetailDTO(
        Long taskId,
        Long studyId,
        String studyTitle,
        String studyDescription,
        boolean blinded,
        ArtifactSummaryDTO artifactA,
        ArtifactSummaryDTO artifactB,
        ArtifactSummaryDTO artifactC,
        ComparisonTaskEntity.TaskStatus status,
        String annotations,
        String description,


        Double clarityA,
        Double relevanceA,
        Double accuracyA,
        String commentA,
        String highlightDataA,


        Double clarityB,
        Double relevanceB,
        Double accuracyB,
        String commentB,
        String highlightDataB,


        Double clarityC,
        Double relevanceC,
        Double accuracyC,
        String commentC,
        String highlightDataC,


        Map<Long, Double> criterionRatingsA,
        Map<Long, Double> criterionRatingsB,
        Map<Long, Double> criterionRatingsC,

        List<StudyRatingCriterionDTO> ratingCriteria
) {
    public ComparisonTaskDetailDTO(ComparisonTaskEntity task, UserRepository userRepository, TaskCriterionRatingRepository taskCriterionRatingRepository, List<StudyRatingCriterionDTO> ratingCriteria) {
        this(
                task.getId(),
                task.getStudy().getId(),
                task.getStudy().getTitle(),
                task.getStudy().getDescription(),
                task.getStudy().isBlinded(),
                createArtifactSummary(task.getArtifactA(), userRepository),
                createArtifactSummary(task.getArtifactB(), userRepository),
                task.getArtifactC() != null ? createArtifactSummary(task.getArtifactC(), userRepository) : null,
                task.getStatus(),
                task.getAnnotations(),
                task.getDescription(),

                task.getClarityA(),
                task.getRelevanceA(),
                task.getAccuracyA(),
                task.getCommentA(),
                task.getHighlightDataA(),

                task.getClarityB(),
                task.getRelevanceB(),
                task.getAccuracyB(),
                task.getCommentB(),
                task.getHighlightDataB(),

                task.getClarityC(),
                task.getRelevanceC(),
                task.getAccuracyC(),
                task.getCommentC(),
                task.getHighlightDataC(),

                taskCriterionRatingRepository != null
                    ? taskCriterionRatingRepository.findByTaskAndArtifactSide(task, "A")
                        .stream().collect(Collectors.toMap(r -> r.getCriterion().getId(), TaskCriterionRatingEntity::getRating))
                    : java.util.Collections.emptyMap(),

                taskCriterionRatingRepository != null
                    ? taskCriterionRatingRepository.findByTaskAndArtifactSide(task, "B")
                        .stream().collect(Collectors.toMap(r -> r.getCriterion().getId(), TaskCriterionRatingEntity::getRating))
                    : java.util.Collections.emptyMap(),

                taskCriterionRatingRepository != null
                    ? taskCriterionRatingRepository.findByTaskAndArtifactSide(task, "C")
                        .stream().collect(Collectors.toMap(r -> r.getCriterion().getId(), TaskCriterionRatingEntity::getRating))
                    : java.util.Collections.emptyMap(),

                ratingCriteria != null ? ratingCriteria : java.util.Collections.emptyList()
        );
    }


    public ComparisonTaskDetailDTO(ComparisonTaskEntity task, UserRepository userRepository, TaskCriterionRatingRepository taskCriterionRatingRepository) {
        this(task, userRepository, taskCriterionRatingRepository, null);
    }

    private static ArtifactSummaryDTO createArtifactSummary(
            com.halenteck.demo.entity.ArtifactEntity artifact,
            UserRepository userRepository) {
        if (artifact == null) return null;
        String uploaderName = null;
        if (artifact.getOwnerId() != null) {
            UserEntity uploader = userRepository.findById(artifact.getOwnerId())
                    .orElse(null);
            uploaderName = uploader != null ? uploader.getName() : null;
        }
        return new ArtifactSummaryDTO(
                artifact.getId(),
                artifact.getFileName(),
                uploaderName
        );
    }
}
