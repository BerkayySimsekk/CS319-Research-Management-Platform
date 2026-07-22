package com.halenteck.demo.repository;

import com.halenteck.demo.entity.ComparisonTaskEntity;
import com.halenteck.demo.entity.StudyRatingCriterionEntity;
import com.halenteck.demo.entity.TaskCriterionRatingEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TaskCriterionRatingRepository extends JpaRepository<TaskCriterionRatingEntity, Long> {
    List<TaskCriterionRatingEntity> findByTask(ComparisonTaskEntity task);
    List<TaskCriterionRatingEntity> findByTaskAndArtifactSide(ComparisonTaskEntity task, String artifactSide);
    Optional<TaskCriterionRatingEntity> findByTaskAndCriterionAndArtifactSide(
        ComparisonTaskEntity task,
        StudyRatingCriterionEntity criterion,
        String artifactSide
    );
}

