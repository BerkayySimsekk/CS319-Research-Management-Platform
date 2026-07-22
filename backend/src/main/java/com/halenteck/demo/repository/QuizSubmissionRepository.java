
package com.halenteck.demo.repository;

import com.halenteck.demo.entity.QuizEntity;
import com.halenteck.demo.entity.QuizSubmissionEntity;
import com.halenteck.demo.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface QuizSubmissionRepository extends JpaRepository<QuizSubmissionEntity, Long> {


    List<QuizSubmissionEntity> findByQuiz(QuizEntity quiz);


    List<QuizSubmissionEntity> findByParticipant(UserEntity participant);



    Optional<QuizSubmissionEntity> findByQuizAndParticipant(QuizEntity quiz, UserEntity participant);


    List<QuizSubmissionEntity> findAllByQuizAndParticipant(QuizEntity quiz, UserEntity participant);


    Optional<QuizSubmissionEntity> findFirstByQuizAndParticipantAndSubmittedAtIsNotNullOrderBySubmittedAtDesc(QuizEntity quiz, UserEntity participant);
}