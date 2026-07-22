
package com.halenteck.demo.repository;

import com.halenteck.demo.entity.QuizEntity;
import com.halenteck.demo.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface QuizRepository extends JpaRepository<QuizEntity, Long> {


    List<QuizEntity> findByCreator(UserEntity creator);
}