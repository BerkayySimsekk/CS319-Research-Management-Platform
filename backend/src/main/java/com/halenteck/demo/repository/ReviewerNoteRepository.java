package com.halenteck.demo.repository;

import com.halenteck.demo.entity.ReviewerNoteEntity;
import com.halenteck.demo.entity.StudyEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReviewerNoteRepository extends JpaRepository<ReviewerNoteEntity, Long> {

    List<ReviewerNoteEntity> findAllByStudyOrderByCreatedAtDesc(StudyEntity study);

    List<ReviewerNoteEntity> findAllByStudyAndReviewerOrderByCreatedAtDesc(StudyEntity study, com.halenteck.demo.entity.UserEntity reviewer);
}

