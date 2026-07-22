
package com.halenteck.demo.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "quiz_submissions")
public class QuizSubmissionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;


    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "quiz_id", nullable = false)
    private QuizEntity quiz;


    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "participant_id", nullable = false)
    private UserEntity participant;


    @Column(nullable = false)
    private LocalDateTime startedAt;


    private LocalDateTime submittedAt;



    private Double score;


    @OneToMany(
            mappedBy = "submission",
            cascade = CascadeType.ALL,
            orphanRemoval = true,
            fetch = FetchType.LAZY
    )
    private List<AnswerEntity> answers = new ArrayList<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "study_version_id")
    private StudyVersionEntity studyVersion;


    public QuizSubmissionEntity() {
    }

    public QuizSubmissionEntity(QuizEntity quiz, UserEntity participant) {
        this.quiz = quiz;
        this.participant = participant;
        this.startedAt = LocalDateTime.now();
        this.score = null;
    }


    public Long getId() { return id; }
    public QuizEntity getQuiz() { return quiz; }
    public UserEntity getParticipant() { return participant; }
    public LocalDateTime getStartedAt() { return startedAt; }
    public LocalDateTime getSubmittedAt() { return submittedAt; }
    public Double getScore() { return score; }
    public List<AnswerEntity> getAnswers() { return answers; }
    public StudyVersionEntity getStudyVersion() { return studyVersion; }


    public void setSubmittedAt(LocalDateTime submittedAt) { this.submittedAt = submittedAt; }
    public void setScore(Double score) { this.score = score; }
    public void setStudyVersion(StudyVersionEntity studyVersion) { this.studyVersion = studyVersion; }


    public void addAnswer(AnswerEntity answer) {
        answers.add(answer);
        answer.setSubmission(this);
    }
}