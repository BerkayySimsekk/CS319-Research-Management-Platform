package com.halenteck.demo.repository;

import com.halenteck.demo.entity.ParticipantEnrollmentStatus;
import com.halenteck.demo.entity.ParticipantStudyEnrollmentEntity;
import com.halenteck.demo.entity.StudyEntity;
import com.halenteck.demo.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ParticipantStudyEnrollmentRepository extends JpaRepository<ParticipantStudyEnrollmentEntity, Long> {

    Optional<ParticipantStudyEnrollmentEntity> findByStudyAndParticipant(StudyEntity study, UserEntity participant);

    List<ParticipantStudyEnrollmentEntity> findByParticipant(UserEntity participant);

    List<ParticipantStudyEnrollmentEntity> findByParticipantAndStatus(UserEntity participant, ParticipantEnrollmentStatus status);

    List<ParticipantStudyEnrollmentEntity> findByStudy(StudyEntity study);
}

