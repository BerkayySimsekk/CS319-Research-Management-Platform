
package com.halenteck.demo.entity;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "options")
public class OptionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private QuestionEntity question;

    @Column(nullable = false, length = 1000)
    private String optionText;



    @Column(nullable = false)
    private boolean isCorrect;


    public OptionEntity() {
    }

    public OptionEntity(QuestionEntity question, String optionText, boolean isCorrect) {
        this.question = question;
        this.optionText = optionText;
        this.isCorrect = isCorrect;
    }


    public Long getId() { return id; }
    public QuestionEntity getQuestion() { return question; }
    public String getOptionText() { return optionText; }
    public boolean isCorrect() { return isCorrect; }


    public void setQuestion(QuestionEntity question) { this.question = question; }
    public void setOptionText(String optionText) { this.optionText = optionText; }
    public void setCorrect(boolean isCorrect) { this.isCorrect = isCorrect; }
}