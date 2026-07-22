
package com.halenteck.demo.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "comparison_tasks")
public class ComparisonTaskEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "study_id", nullable = false)
    private StudyEntity study;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "participant_id", nullable = false)
    private UserEntity participant;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "artifact_a_id", nullable = false)
    private ArtifactEntity artifactA;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "artifact_b_id", nullable = false)
    private ArtifactEntity artifactB;


    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "artifact_c_id", nullable = true)
    private ArtifactEntity artifactC;


    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "study_version_id")
    private StudyVersionEntity studyVersion;

    @Enumerated(EnumType.STRING)
    private TaskStatus status;

    @Column(length = 5000)
    private String annotations;

    @Column(length = 2000)
    private String description;


    private Double clarityA;
    private Double relevanceA;
    private Double accuracyA;
    @Column(length = 2000)
    private String commentA;


    private Double clarityB;
    private Double relevanceB;
    private Double accuracyB;
    @Column(length = 2000)
    private String commentB;


    private Double clarityC;
    private Double relevanceC;
    private Double accuracyC;
    @Column(length = 2000)
    private String commentC;



    @Column(columnDefinition = "TEXT")
    private String highlightDataA;

    @Column(columnDefinition = "TEXT")
    private String highlightDataB;


    @Column(columnDefinition = "TEXT")
    private String highlightDataC;


    private LocalDateTime createdAt;
    private LocalDateTime completedAt;

    public enum TaskStatus { PENDING, IN_PROGRESS, COMPLETED }

    public ComparisonTaskEntity() {}

    public ComparisonTaskEntity(StudyEntity study, UserEntity participant, ArtifactEntity artifactA, ArtifactEntity artifactB) {
        this.study = study;
        this.participant = participant;
        this.artifactA = artifactA;
        this.artifactB = artifactB;
        this.status = TaskStatus.PENDING;
    }


    public ComparisonTaskEntity(StudyEntity study, UserEntity participant, ArtifactEntity artifactA, ArtifactEntity artifactB, ArtifactEntity artifactC) {
        this.study = study;
        this.participant = participant;
        this.artifactA = artifactA;
        this.artifactB = artifactB;
        this.artifactC = artifactC;
        this.status = TaskStatus.PENDING;
    }

    @PrePersist
    protected void onCreate() { this.createdAt = LocalDateTime.now(); }


    public Long getId() { return id; }
    public StudyEntity getStudy() { return study; }
    public UserEntity getParticipant() { return participant; }
    public ArtifactEntity getArtifactA() { return artifactA; }
    public ArtifactEntity getArtifactB() { return artifactB; }
    public ArtifactEntity getArtifactC() { return artifactC; }
    public TaskStatus getStatus() { return status; }
    public String getAnnotations() { return annotations; }
    public String getDescription() { return description; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getCompletedAt() { return completedAt; }

    public Double getClarityA() { return clarityA; }
    public Double getRelevanceA() { return relevanceA; }
    public Double getAccuracyA() { return accuracyA; }
    public String getCommentA() { return commentA; }

    public Double getClarityB() { return clarityB; }
    public Double getRelevanceB() { return relevanceB; }
    public Double getAccuracyB() { return accuracyB; }
    public String getCommentB() { return commentB; }


    public Double getClarityC() { return clarityC; }
    public Double getRelevanceC() { return relevanceC; }
    public Double getAccuracyC() { return accuracyC; }
    public String getCommentC() { return commentC; }

    public String getHighlightDataA() { return highlightDataA; }
    public String getHighlightDataB() { return highlightDataB; }
    public String getHighlightDataC() { return highlightDataC; }
    public StudyVersionEntity getStudyVersion() { return studyVersion; }

    public void setStatus(TaskStatus status) { this.status = status; }
    public void setAnnotations(String annotations) { this.annotations = annotations; }
    public void setDescription(String description) { this.description = description; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }

    public void setClarityA(Double clarityA) { this.clarityA = clarityA; }
    public void setRelevanceA(Double relevanceA) { this.relevanceA = relevanceA; }
    public void setAccuracyA(Double accuracyA) { this.accuracyA = accuracyA; }
    public void setCommentA(String commentA) { this.commentA = commentA; }

    public void setClarityB(Double clarityB) { this.clarityB = clarityB; }
    public void setRelevanceB(Double relevanceB) { this.relevanceB = relevanceB; }
    public void setAccuracyB(Double accuracyB) { this.accuracyB = accuracyB; }
    public void setCommentB(String commentB) { this.commentB = commentB; }


    public void setClarityC(Double clarityC) { this.clarityC = clarityC; }
    public void setRelevanceC(Double relevanceC) { this.relevanceC = relevanceC; }
    public void setAccuracyC(Double accuracyC) { this.accuracyC = accuracyC; }
    public void setCommentC(String commentC) { this.commentC = commentC; }

    public void setHighlightDataA(String highlightDataA) { this.highlightDataA = highlightDataA; }
    public void setHighlightDataB(String highlightDataB) { this.highlightDataB = highlightDataB; }
    public void setHighlightDataC(String highlightDataC) { this.highlightDataC = highlightDataC; }
    public void setStudyVersion(StudyVersionEntity studyVersion) { this.studyVersion = studyVersion; }
}
