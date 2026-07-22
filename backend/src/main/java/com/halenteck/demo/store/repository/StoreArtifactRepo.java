package com.halenteck.demo.store.repository;

import com.halenteck.demo.store.entity.StoreArtifactEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StoreArtifactRepo extends JpaRepository<StoreArtifactEntity, Long> {


    boolean existsByOwnerIdAndSha256Hash(Long ownerId, String sha256Hash);




    List<StoreArtifactEntity> findByOwnerIdAndIsCurrentVersionTrueOrderByCreatedAtDesc(Long ownerId);




    List<StoreArtifactEntity> findByOwnerIdAndFilenameOrderByVersionNumberDesc(Long ownerId, String filename);


    @Transactional
    @Modifying
    void deleteByIdAndOwnerId(Long id, Long ownerId);
}
