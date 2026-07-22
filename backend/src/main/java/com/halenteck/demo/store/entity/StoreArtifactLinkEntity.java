package com.halenteck.demo.store.entity;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.Instant;

@Entity
@Table(name = "store_artifact_links")
public class StoreArtifactLinkEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;


    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "source_id", nullable = false)
    @JsonIgnoreProperties({"data", "thumbnailData", "tags", "folder"})
    private StoreArtifactEntity sourceArtifact;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "target_id", nullable = false)
    @JsonIgnoreProperties({"data", "thumbnailData", "tags", "folder"})
    private StoreArtifactEntity targetArtifact;

    @Column(name = "relationship_type", nullable = false)
    private String relationshipType;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();



    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public StoreArtifactEntity getSourceArtifact() { return sourceArtifact; }
    public void setSourceArtifact(StoreArtifactEntity sourceArtifact) { this.sourceArtifact = sourceArtifact; }

    public StoreArtifactEntity getTargetArtifact() { return targetArtifact; }
    public void setTargetArtifact(StoreArtifactEntity targetArtifact) { this.targetArtifact = targetArtifact; }

    public String getRelationshipType() { return relationshipType; }
    public void setRelationshipType(String relationshipType) { this.relationshipType = relationshipType; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}