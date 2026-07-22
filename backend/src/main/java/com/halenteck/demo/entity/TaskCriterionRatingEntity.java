package com.halenteck.demo.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "task_criterion_ratings", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"task_id", "criterion_id", "artifact_side"})
})
public class TaskCriterionRatingEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "task_id", nullable = false)
    private ComparisonTaskEntity task;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "criterion_id", nullable = false)
    private StudyRatingCriterionEntity criterion;

    @Column(nullable = false, length = 1)
    private String artifactSide;

    @Column(nullable = false)
    private Double rating;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public TaskCriterionRatingEntity() {
    }

    public TaskCriterionRatingEntity(ComparisonTaskEntity task,
                                     StudyRatingCriterionEntity criterion,
                                     String artifactSide,
                                     Double rating) {
        this.task = task;
        this.criterion = criterion;
        this.artifactSide = artifactSide;
        this.rating = rating;
    }

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }


    public Long getId() { return id; }
    public ComparisonTaskEntity getTask() { return task; }
    public StudyRatingCriterionEntity getCriterion() { return criterion; }
    public String getArtifactSide() { return artifactSide; }
    public Double getRating() { return rating; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }

    public void setTask(ComparisonTaskEntity task) { this.task = task; }
    public void setCriterion(StudyRatingCriterionEntity criterion) { this.criterion = criterion; }
    public void setArtifactSide(String artifactSide) { this.artifactSide = artifactSide; }
    public void setRating(Double rating) { this.rating = rating; }
}

