package com.halenteck.demo.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "participant_study_enrollments",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_participant_study", columnNames = {"study_id", "participant_id"})
        })
public class ParticipantStudyEnrollmentEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "study_id", nullable = false)
    private StudyEntity study;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "participant_id", nullable = false)
    private UserEntity participant;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ParticipantEnrollmentStatus status = ParticipantEnrollmentStatus.PENDING_QUIZ;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "quiz_submission_id")
    private QuizSubmissionEntity quizSubmission;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "questionnaire_submission_id")
    private QuizSubmissionEntity questionnaireSubmission;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invite_id")
    private StudyInviteEntity invite;

    @Column(nullable = false, updatable = false)
    private LocalDateTime enrolledAt;

    private LocalDateTime quizCompletedAt;
    private LocalDateTime questionnaireCompletedAt;

    public ParticipantStudyEnrollmentEntity() {
    }

    public ParticipantStudyEnrollmentEntity(StudyEntity study, UserEntity participant, StudyInviteEntity invite) {
        this.study = study;
        this.participant = participant;
        this.invite = invite;
        this.status = ParticipantEnrollmentStatus.PENDING_QUIZ;
    }

    @PrePersist
    protected void onCreate() {
        this.enrolledAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public StudyEntity getStudy() {
        return study;
    }

    public UserEntity getParticipant() {
        return participant;
    }

    public ParticipantEnrollmentStatus getStatus() {
        return status;
    }

    public void setStatus(ParticipantEnrollmentStatus status) {
        this.status = status;
    }

    public QuizSubmissionEntity getQuizSubmission() {
        return quizSubmission;
    }

    public void setQuizSubmission(QuizSubmissionEntity quizSubmission) {
        this.quizSubmission = quizSubmission;
    }

    public StudyInviteEntity getInvite() {
        return invite;
    }

    public void setInvite(StudyInviteEntity invite) {
        this.invite = invite;
    }

    public LocalDateTime getEnrolledAt() {
        return enrolledAt;
    }

    public LocalDateTime getQuizCompletedAt() {
        return quizCompletedAt;
    }

    public void setQuizCompletedAt(LocalDateTime quizCompletedAt) {
        this.quizCompletedAt = quizCompletedAt;
    }

    public QuizSubmissionEntity getQuestionnaireSubmission() {
        return questionnaireSubmission;
    }

    public void setQuestionnaireSubmission(QuizSubmissionEntity questionnaireSubmission) {
        this.questionnaireSubmission = questionnaireSubmission;
    }

    public LocalDateTime getQuestionnaireCompletedAt() {
        return questionnaireCompletedAt;
    }

    public void setQuestionnaireCompletedAt(LocalDateTime questionnaireCompletedAt) {
        this.questionnaireCompletedAt = questionnaireCompletedAt;
    }
}

