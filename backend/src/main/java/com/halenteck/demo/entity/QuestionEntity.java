
package com.halenteck.demo.entity;

import com.halenteck.demo.QuestionType;
import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "questions")
public class QuestionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "quiz_id", nullable = false)
    private QuizEntity quiz;

    @Column(nullable = false, length = 2000)
    private String questionText;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private QuestionType questionType;


    @OneToMany(
            mappedBy = "question",
            cascade = CascadeType.ALL,
            orphanRemoval = true,
            fetch = FetchType.LAZY
    )
    private List<OptionEntity> options = new ArrayList<>();


    public QuestionEntity() {
    }

    public QuestionEntity(QuizEntity quiz, String questionText, QuestionType questionType) {
        this.quiz = quiz;
        this.questionText = questionText;
        this.questionType = questionType;
    }


    public Long getId() { return id; }
    public QuizEntity getQuiz() { return quiz; }
    public String getQuestionText() { return questionText; }
    public QuestionType getQuestionType() { return questionType; }
    public List<OptionEntity> getOptions() { return options; }


    public void setQuiz(QuizEntity quiz) { this.quiz = quiz; }
    public void setQuestionText(String questionText) { this.questionText = questionText; }
    public void setQuestionType(QuestionType questionType) { this.questionType = questionType; }


    public void addOption(OptionEntity option) {
        if (this.questionType != QuestionType.MULTIPLE_CHOICE) {
            throw new IllegalStateException("Options can only be added to MULTIPLE_CHOICE questions.");
        }
        options.add(option);
        option.setQuestion(this);
    }

    public void removeOption(OptionEntity option) {
        options.remove(option);
        option.setQuestion(null);
    }
}