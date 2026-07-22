
package com.halenteck.demo.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "answers")
public class AnswerEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;


    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "submission_id", nullable = false)
    private QuizSubmissionEntity submission;


    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "question_id", nullable = false)
    private QuestionEntity question;


    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "selected_option_id", nullable = true)
    private OptionEntity selectedOption;


    @Column(length = 2000, nullable = true)
    private String answerText;


    public AnswerEntity() {
    }


    public AnswerEntity(QuizSubmissionEntity submission, QuestionEntity question, OptionEntity selectedOption) {
        this.submission = submission;
        this.question = question;
        this.selectedOption = selectedOption;
        this.answerText = null;
    }


    public AnswerEntity(QuizSubmissionEntity submission, QuestionEntity question, String answerText) {
        this.submission = submission;
        this.question = question;
        this.selectedOption = null;
        this.answerText = answerText;
    }



    public Long getId() { return id; }
    public QuizSubmissionEntity getSubmission() { return submission; }
    public QuestionEntity getQuestion() { return question; }
    public OptionEntity getSelectedOption() { return selectedOption; }
    public String getAnswerText() { return answerText; }


    public void setSubmission(QuizSubmissionEntity submission) { this.submission = submission; }
    public void setQuestion(QuestionEntity question) { this.question = question; }
    public void setSelectedOption(OptionEntity selectedOption) { this.selectedOption = selectedOption; }
    public void setAnswerText(String answerText) { this.answerText = answerText; }
}