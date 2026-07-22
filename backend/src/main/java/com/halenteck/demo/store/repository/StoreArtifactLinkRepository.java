package com.halenteck.demo.store.repository;

import com.halenteck.demo.store.entity.StoreArtifactLinkEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface StoreArtifactLinkRepository extends JpaRepository<StoreArtifactLinkEntity, Long> {


    List<StoreArtifactLinkEntity> findBySourceArtifactId(Long sourceId);


    List<StoreArtifactLinkEntity> findByTargetArtifactId(Long targetId);


    @Modifying
    @Transactional
    @Query("DELETE FROM StoreArtifactLinkEntity l WHERE l.sourceArtifact.id = :artifactId OR l.targetArtifact.id = :artifactId")
    void deleteByArtifactId(Long artifactId);
}