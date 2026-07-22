package com.halenteck.demo.store.controller;

import com.halenteck.demo.security.CustomUserDetails;
import com.halenteck.demo.store.entity.FolderEntity;
import com.halenteck.demo.store.entity.StoreArtifactEntity;
import com.halenteck.demo.store.entity.TagEntity;
import com.halenteck.demo.store.repository.FolderRepository;
import com.halenteck.demo.store.repository.StoreArtifactRepo;
import com.halenteck.demo.store.repository.TagRepository;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.transaction.annotation.Transactional;
import com.halenteck.demo.store.entity.StoreArtifactLinkEntity;
import com.halenteck.demo.store.repository.StoreArtifactLinkRepository;


import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api/store-artifacts")
public class StoreArtifactController {

    private final StoreArtifactRepo artifactRepo;
    private final FolderRepository folderRepo;
    private final TagRepository tagRepo;
        private final StoreArtifactLinkRepository linkRepo;


    public StoreArtifactController(StoreArtifactRepo artifactRepo,
                                   FolderRepository folderRepo,
                                   TagRepository tagRepo,StoreArtifactLinkRepository linkRepo) {
        this.artifactRepo = artifactRepo;
        this.folderRepo = folderRepo;
        this.tagRepo = tagRepo;
        this.linkRepo = linkRepo;
    }


    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> upload(@RequestParam("file") MultipartFile file,
                                    @RequestParam(value = "folderId", required = false) Long folderId,
                                    @RequestParam(value = "tags", required = false) List<String> tags,
                                    Authentication authentication) {
        try {

            if (authentication == null || !(authentication.getPrincipal() instanceof CustomUserDetails)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Yetkisiz erişim."));
            }
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
            Long ownerId = userDetails.getId();


            String sha256 = sha256Hex(file.getBytes());
            if (artifactRepo.existsByOwnerIdAndSha256Hash(ownerId, sha256)) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(Map.of("duplicate", true, "message", "Bu içerikte bir dosya zaten yüklü."));
            }



            List<StoreArtifactEntity> existingVersions = artifactRepo.findByOwnerIdAndFilenameOrderByVersionNumberDesc(ownerId, file.getOriginalFilename());


            for (StoreArtifactEntity oldArtifact : existingVersions) {
                oldArtifact.setIsCurrentVersion(false);

                if (oldArtifact.getStoragePath() == null) {
                    oldArtifact.setStoragePath("db://");
                }

                if (oldArtifact.getStorageUrl() == null || oldArtifact.getStorageUrl().isEmpty()) {
                    oldArtifact.setStorageUrl("/api/store-artifacts/download/" + oldArtifact.getId());
                }
                artifactRepo.save(oldArtifact);
            }


            int nextVersion = existingVersions.isEmpty() ? 1 : existingVersions.get(0).getVersionNumber() + 1;


            StoreArtifactEntity artifact = new StoreArtifactEntity();
            artifact.setOwnerId(ownerId);
            artifact.setFilename(file.getOriginalFilename());
            artifact.setMimeType(file.getContentType());
            artifact.setSizeBytes(file.getSize());
            artifact.setSha256Hash(sha256);
            artifact.setIsActive(true);


            artifact.setVersionNumber(nextVersion);
            artifact.setIsCurrentVersion(true);

            artifact.setCreatedAt(Instant.now());
            artifact.setUpdatedAt(Instant.now());


            artifact.setStoragePath("db://");



            artifact.setStorageUrl("/api/store-artifacts/download/temp");


            artifact.setData(file.getBytes());


            if (folderId != null) {
                Optional<FolderEntity> folderOpt = folderRepo.findById(folderId);
                if (folderOpt.isPresent() && folderOpt.get().getOwnerId().equals(ownerId)) {
                    artifact.setFolder(folderOpt.get());
                }
            }


            if (tags != null && !tags.isEmpty()) {
                Set<TagEntity> tagEntities = new HashSet<>();
                for (String tagName : tags) {
                    String cleanTag = tagName.trim();
                    if (!cleanTag.isEmpty()) {
                        TagEntity tag = tagRepo.findByName(cleanTag)
                                .orElseGet(() -> {
                                    TagEntity newTag = new TagEntity();
                                    newTag.setName(cleanTag);
                                    return tagRepo.save(newTag);
                                });
                        tagEntities.add(tag);
                    }
                }
                artifact.setTags(tagEntities);
            }


            String mimeType = file.getContentType();
            if (mimeType != null) {
                boolean isText = mimeType.startsWith("text/") ||
                                 (mimeType.contains("json") && !mimeType.contains("openxmlformats")) ||
                                 (mimeType.contains("xml") && !mimeType.contains("openxmlformats")) ||
                                 mimeType.contains("javascript");

                if (isText) {
                    String content = new String(file.getBytes(), StandardCharsets.UTF_8);
                    if (!content.contains("\u0000")) {
                        String preview = content.length() > 1000 ? content.substring(0, 1000) + "..." : content;
                        artifact.setPreviewText(preview);
                    }
                }
            }


            StoreArtifactEntity savedArtifact = artifactRepo.save(artifact);


            savedArtifact.setStorageUrl("/api/store-artifacts/download/" + savedArtifact.getId());
            savedArtifact = artifactRepo.save(savedArtifact);

            return ResponseEntity.status(HttpStatus.CREATED).body(savedArtifact);

        } catch (Exception ex) {
            ex.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", ex.getMessage()));
        }
    }


    @GetMapping("/my-artifacts")
    public ResponseEntity<?> getMyArtifacts(Authentication authentication) {
        try {
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
            Long ownerId = userDetails.getId();


            List<StoreArtifactEntity> artifacts = artifactRepo.findByOwnerIdAndIsCurrentVersionTrueOrderByCreatedAtDesc(ownerId);
            return ResponseEntity.ok(artifacts);

        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", ex.getMessage()));
        }
    }


    @GetMapping("/history/{filename}")
    public ResponseEntity<?> getArtifactHistory(@PathVariable String filename, Authentication authentication) {
        try {
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
            Long ownerId = userDetails.getId();


            List<StoreArtifactEntity> history = artifactRepo.findByOwnerIdAndFilenameOrderByVersionNumberDesc(ownerId, filename);
            return ResponseEntity.ok(history);

        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", ex.getMessage()));
        }
    }


    @PutMapping("/{id}/make-current")
    public ResponseEntity<?> makeVersionCurrent(@PathVariable Long id, Authentication authentication) {
        try {
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
            Long ownerId = userDetails.getId();


            StoreArtifactEntity targetArtifact = artifactRepo.findById(id)
                    .orElseThrow(() -> new RuntimeException("Artifact not found"));

            if (!targetArtifact.getOwnerId().equals(ownerId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Bu dosya size ait değil."));
            }


            List<StoreArtifactEntity> allVersions = artifactRepo.findByOwnerIdAndFilenameOrderByVersionNumberDesc(ownerId, targetArtifact.getFilename());


            for (StoreArtifactEntity artifact : allVersions) {
                artifact.setIsCurrentVersion(false);

                if (artifact.getStoragePath() == null) {
                    artifact.setStoragePath("db://");
                }

                if (artifact.getStorageUrl() == null || artifact.getStorageUrl().isEmpty()) {
                    artifact.setStorageUrl("/api/store-artifacts/download/" + artifact.getId());
                }
                artifactRepo.save(artifact);
            }


            targetArtifact.setIsCurrentVersion(true);

            if (targetArtifact.getStoragePath() == null) {
                targetArtifact.setStoragePath("db://");
            }

            if (targetArtifact.getStorageUrl() == null || targetArtifact.getStorageUrl().isEmpty()) {
                targetArtifact.setStorageUrl("/api/store-artifacts/download/" + targetArtifact.getId());
            }
            artifactRepo.save(targetArtifact);

            return ResponseEntity.ok(Map.of("message", "Version " + targetArtifact.getVersionNumber() + " is now current."));

        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", ex.getMessage()));
        }
    }


    @GetMapping("/download/{id}")
    public ResponseEntity<?> downloadArtifact(@PathVariable Long id) {
        try {
            StoreArtifactEntity artifact = artifactRepo.findById(id)
                    .orElseThrow(() -> new RuntimeException("Artifact bulunamadı!"));

            byte[] fileContent = artifact.getData();
            if (fileContent == null || fileContent.length == 0) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Dosya içeriği boş."));
            }

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(artifact.getMimeType()))
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "inline; filename=\"" + artifact.getFilename() + "\"")
                    .body(fileContent);

        } catch (Exception ex) {
            ex.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", ex.getMessage()));
        }
    }

   @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> deleteArtifact(@PathVariable Long id, Authentication authentication) {
        try {
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
            Long ownerId = userDetails.getId();


            StoreArtifactEntity artifactToDelete = artifactRepo.findById(id).orElse(null);
            if (artifactToDelete == null) {
                 return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Dosya bulunamadı."));
            }
            if (!artifactToDelete.getOwnerId().equals(ownerId)) {
                 return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Yetkisiz işlem."));
            }


            boolean wasCurrent = artifactToDelete.getIsCurrentVersion();
            String filename = artifactToDelete.getFilename();


            linkRepo.deleteByArtifactId(id);


            artifactRepo.delete(artifactToDelete);



            artifactRepo.flush();


            if (wasCurrent) {

                List<StoreArtifactEntity> remainingVersions = artifactRepo
                        .findByOwnerIdAndFilenameOrderByVersionNumberDesc(ownerId, filename);

                if (!remainingVersions.isEmpty()) {

                    StoreArtifactEntity newCurrentVersion = remainingVersions.get(0);


                    newCurrentVersion.setIsCurrentVersion(true);


                    if (newCurrentVersion.getStorageUrl() == null || newCurrentVersion.getStorageUrl().isEmpty()) {
                         newCurrentVersion.setStorageUrl("/api/store-artifacts/download/" + newCurrentVersion.getId());
                    }

                    artifactRepo.save(newCurrentVersion);

                }
            }

            return ResponseEntity.ok(Map.of("deleted", true, "id", id));

        } catch (Exception ex) {
            ex.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", ex.getMessage()));
        }
    }

    @PatchMapping("/{id}/tags")
    public ResponseEntity<?> updateArtifactTags(@PathVariable Long id, @RequestBody Map<String, Object> requestBody, Authentication authentication) {
        try {
            if (authentication == null || !(authentication.getPrincipal() instanceof CustomUserDetails)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Yetkisiz erişim."));
            }
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
            Long ownerId = userDetails.getId();

            StoreArtifactEntity artifact = artifactRepo.findById(id).orElseThrow(() -> new RuntimeException("Artifact not found"));
            if (!artifact.getOwnerId().equals(ownerId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Bu dosya size ait değil."));
            }

            @SuppressWarnings("unchecked")
            List<String> tagNames = (List<String>) requestBody.get("tags");
            if (tagNames == null) return ResponseEntity.badRequest().body(Map.of("error", "Tags listesi gerekli."));

            Set<TagEntity> newTags = new HashSet<>();
            for (String tagName : tagNames) {
                String cleanTag = tagName.trim();
                if (!cleanTag.isEmpty()) {
                    TagEntity tag = tagRepo.findByName(cleanTag).orElseGet(() -> {
                        TagEntity newTag = new TagEntity();
                        newTag.setName(cleanTag);
                        return tagRepo.save(newTag);
                    });
                    newTags.add(tag);
                }
            }
            artifact.setTags(newTags);
            artifact.setUpdatedAt(Instant.now());
            StoreArtifactEntity updatedArtifact = artifactRepo.save(artifact);

            return ResponseEntity.ok(Map.of("success", true, "message", "Tags başarıyla güncellendi.", "artifact", updatedArtifact));

        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", ex.getMessage()));
        }
    }


    @PostMapping(value = "/bulk-upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> bulkUpload(@RequestParam("files") MultipartFile[] files,
                                        @RequestParam(value = "folderId", required = false) Long folderId,
                                        @RequestParam(value = "tags", required = false) List<String> tags,
                                        Authentication authentication) {
        try {
            if (authentication == null || !(authentication.getPrincipal() instanceof CustomUserDetails)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Yetkisiz erişim."));
            }

            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
            Long ownerId = userDetails.getId();

            List<Map<String, Object>> results = new ArrayList<>();
            int successCount = 0;
            int failureCount = 0;
            int duplicateCount = 0;

            for (MultipartFile file : files) {
                try {

                    String sha256 = sha256Hex(file.getBytes());


                    if (artifactRepo.existsByOwnerIdAndSha256Hash(ownerId, sha256)) {
                        duplicateCount++;
                        results.add(Map.of(
                            "filename", file.getOriginalFilename(),
                            "status", "duplicate",
                            "message", "Bu içerikte bir dosya zaten yüklü."
                        ));
                        continue;
                    }


                    List<StoreArtifactEntity> existingVersions = artifactRepo
                            .findByOwnerIdAndFilenameOrderByVersionNumberDesc(ownerId, file.getOriginalFilename());

                    for (StoreArtifactEntity oldArtifact : existingVersions) {
                        oldArtifact.setIsCurrentVersion(false);
                        artifactRepo.save(oldArtifact);
                    }

                    int nextVersion = existingVersions.isEmpty() ? 1 : existingVersions.get(0).getVersionNumber() + 1;


                    StoreArtifactEntity artifact = new StoreArtifactEntity();
                    artifact.setOwnerId(ownerId);
                    artifact.setFilename(file.getOriginalFilename());
                    artifact.setMimeType(file.getContentType());
                    artifact.setSizeBytes(file.getSize());
                    artifact.setSha256Hash(sha256);
                    artifact.setIsActive(true);
                    artifact.setVersionNumber(nextVersion);
                    artifact.setIsCurrentVersion(true);
                    artifact.setCreatedAt(Instant.now());
                    artifact.setUpdatedAt(Instant.now());
                    artifact.setData(file.getBytes());


                    if (folderId != null) {
                        Optional<FolderEntity> folderOpt = folderRepo.findById(folderId);
                        if (folderOpt.isPresent() && folderOpt.get().getOwnerId().equals(ownerId)) {
                            artifact.setFolder(folderOpt.get());
                        }
                    }


                    if (tags != null && !tags.isEmpty()) {
                        Set<TagEntity> tagEntities = new HashSet<>();
                        for (String tagName : tags) {
                            String cleanTag = tagName.trim();
                            if (!cleanTag.isEmpty()) {
                                TagEntity tag = tagRepo.findByName(cleanTag)
                                        .orElseGet(() -> {
                                            TagEntity newTag = new TagEntity();
                                            newTag.setName(cleanTag);
                                            return tagRepo.save(newTag);
                                        });
                                tagEntities.add(tag);
                            }
                        }
                        artifact.setTags(tagEntities);
                    }


                    String mimeType = file.getContentType();
                    if (mimeType != null) {
                        boolean isText = mimeType.startsWith("text/") ||
                                         (mimeType.contains("json") && !mimeType.contains("openxmlformats")) ||
                                         (mimeType.contains("xml") && !mimeType.contains("openxmlformats")) ||
                                         mimeType.contains("javascript");

                        if (isText) {
                            String content = new String(file.getBytes(), StandardCharsets.UTF_8);
                            if (!content.contains("\u0000")) {
                                String preview = content.length() > 1000 ? content.substring(0, 1000) + "..." : content;
                                artifact.setPreviewText(preview);
                            }
                        }
                    }


                    StoreArtifactEntity savedArtifact = artifactRepo.save(artifact);

                    successCount++;
                    results.add(Map.of(
                        "filename", file.getOriginalFilename(),
                        "status", "success",
                        "id", savedArtifact.getId(),
                        "version", nextVersion
                    ));

                } catch (Exception ex) {
                    failureCount++;
                    results.add(Map.of(
                        "filename", file.getOriginalFilename(),
                        "status", "error",
                        "message", ex.getMessage()
                    ));
                }
            }

            return ResponseEntity.ok(Map.of(
                "total", files.length,
                "success", successCount,
                "failure", failureCount,
                "duplicate", duplicateCount,
                "results", results
            ));

        } catch (Exception ex) {
            ex.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", ex.getMessage()));
        }
    }


    @PostMapping("/bulk-import")
    public ResponseEntity<?> bulkImport(@RequestBody Map<String, Object> importData,
                                        Authentication authentication) {
        try {
            if (authentication == null || !(authentication.getPrincipal() instanceof CustomUserDetails)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Yetkisiz erişim."));
            }

            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
            Long ownerId = userDetails.getId();

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> artifacts = (List<Map<String, Object>>) importData.get("artifacts");

            if (artifacts == null || artifacts.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Artifact listesi boş olamaz."));
            }

            List<Map<String, Object>> results = new ArrayList<>();
            int successCount = 0;
            int failureCount = 0;

            for (Map<String, Object> artifactData : artifacts) {
                try {
                    String filename = (String) artifactData.get("filename");
                    String mimeType = (String) artifactData.getOrDefault("mimeType", "application/octet-stream");
                    String base64Data = (String) artifactData.get("data");

                    if (filename == null || base64Data == null) {
                        failureCount++;
                        results.add(Map.of(
                            "filename", filename != null ? filename : "unknown",
                            "status", "error",
                            "message", "Filename ve data alanları zorunludur."
                        ));
                        continue;
                    }


                    byte[] fileData = Base64.getDecoder().decode(base64Data);


                    String sha256 = sha256Hex(fileData);


                    if (artifactRepo.existsByOwnerIdAndSha256Hash(ownerId, sha256)) {
                        failureCount++;
                        results.add(Map.of(
                            "filename", filename,
                            "status", "duplicate",
                            "message", "Bu içerikte bir dosya zaten yüklü."
                        ));
                        continue;
                    }


                    List<StoreArtifactEntity> existingVersions = artifactRepo
                            .findByOwnerIdAndFilenameOrderByVersionNumberDesc(ownerId, filename);

                    for (StoreArtifactEntity oldArtifact : existingVersions) {
                        oldArtifact.setIsCurrentVersion(false);
                        artifactRepo.save(oldArtifact);
                    }

                    int nextVersion = existingVersions.isEmpty() ? 1 : existingVersions.get(0).getVersionNumber() + 1;


                    StoreArtifactEntity artifact = new StoreArtifactEntity();
                    artifact.setOwnerId(ownerId);
                    artifact.setFilename(filename);
                    artifact.setMimeType(mimeType);
                    artifact.setSizeBytes((long) fileData.length);
                    artifact.setSha256Hash(sha256);
                    artifact.setIsActive(true);
                    artifact.setVersionNumber(nextVersion);
                    artifact.setIsCurrentVersion(true);
                    artifact.setCreatedAt(Instant.now());
                    artifact.setUpdatedAt(Instant.now());
                    artifact.setData(fileData);


                    Object folderIdObj = artifactData.get("folderId");
                    if (folderIdObj != null) {
                        Long folderId = Long.valueOf(folderIdObj.toString());
                        Optional<FolderEntity> folderOpt = folderRepo.findById(folderId);
                        if (folderOpt.isPresent() && folderOpt.get().getOwnerId().equals(ownerId)) {
                            artifact.setFolder(folderOpt.get());
                        }
                    }


                    @SuppressWarnings("unchecked")
                    List<String> tags = (List<String>) artifactData.get("tags");
                    if (tags != null && !tags.isEmpty()) {
                        Set<TagEntity> tagEntities = new HashSet<>();
                        for (String tagName : tags) {
                            String cleanTag = tagName.trim();
                            if (!cleanTag.isEmpty()) {
                                TagEntity tag = tagRepo.findByName(cleanTag)
                                        .orElseGet(() -> {
                                            TagEntity newTag = new TagEntity();
                                            newTag.setName(cleanTag);
                                            return tagRepo.save(newTag);
                                        });
                                tagEntities.add(tag);
                            }
                        }
                        artifact.setTags(tagEntities);
                    }


                    if (mimeType != null) {
                        boolean isText = mimeType.startsWith("text/") ||
                                         (mimeType.contains("json") && !mimeType.contains("openxmlformats")) ||
                                         (mimeType.contains("xml") && !mimeType.contains("openxmlformats")) ||
                                         mimeType.contains("javascript");

                        if (isText) {
                            String content = new String(fileData, StandardCharsets.UTF_8);
                            if (!content.contains("\u0000")) {
                                String preview = content.length() > 1000 ? content.substring(0, 1000) + "..." : content;
                                artifact.setPreviewText(preview);
                            }
                        }
                    }


                    StoreArtifactEntity savedArtifact = artifactRepo.save(artifact);

                    successCount++;
                    results.add(Map.of(
                        "filename", filename,
                        "status", "success",
                        "id", savedArtifact.getId(),
                        "version", nextVersion
                    ));

                } catch (Exception ex) {
                    failureCount++;
                    results.add(Map.of(
                        "filename", artifactData.getOrDefault("filename", "unknown"),
                        "status", "error",
                        "message", ex.getMessage()
                    ));
                }
            }

            return ResponseEntity.ok(Map.of(
                "total", artifacts.size(),
                "success", successCount,
                "failure", failureCount,
                "results", results
            ));

        } catch (Exception ex) {
            ex.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", ex.getMessage()));
        }
    }


    @PutMapping("/{id}/move")
    public ResponseEntity<?> moveArtifact(@PathVariable Long id,
                                          @RequestBody Map<String, Object> requestBody,
                                          Authentication authentication) {
        try {
            if (authentication == null || !(authentication.getPrincipal() instanceof CustomUserDetails)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Yetkisiz erişim."));
            }
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
            Long ownerId = userDetails.getId();

            StoreArtifactEntity artifact = artifactRepo.findById(id)
                    .orElseThrow(() -> new RuntimeException("Artifact bulunamadı."));

            if (!artifact.getOwnerId().equals(ownerId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Bu dosya size ait değil."));
            }


            Object folderIdObj = requestBody.get("folderId");
            Long folderId = null;

            if (folderIdObj != null) {
                if (folderIdObj instanceof Number) {
                    folderId = ((Number) folderIdObj).longValue();
                } else {
                    String val = folderIdObj.toString();
                    if (!val.isEmpty() && !val.equals("null")) {
                        try {
                            folderId = Long.valueOf(val);
                        } catch (NumberFormatException e) {
                            return ResponseEntity.badRequest()
                                .body(Map.of("error", "Geçersiz klasör ID'si: " + val));
                        }
                    }
                }
            }

            if (folderId != null) {
                FolderEntity folder = folderRepo.findById(folderId)
                        .orElseThrow(() -> new RuntimeException("Hedef klasör bulunamadı."));

                if (!folder.getOwnerId().equals(ownerId)) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Hedef klasör size ait değil."));
                }
                artifact.setFolder(folder);
            } else {
                artifact.setFolder(null);
            }

            artifact.setUpdatedAt(Instant.now());
            StoreArtifactEntity updatedArtifact = artifactRepo.save(artifact);

            return ResponseEntity.ok(updatedArtifact);

        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", ex.getMessage()));
        }
    }


    @PostMapping("/{id}/links")
    public ResponseEntity<?> createLink(@PathVariable Long id,
                                        @RequestBody Map<String, Object> requestBody,
                                        Authentication authentication) {
        try {
            if (authentication == null || !(authentication.getPrincipal() instanceof CustomUserDetails)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Yetkisiz erişim."));
            }
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
            Long ownerId = userDetails.getId();


            StoreArtifactEntity sourceArtifact = artifactRepo.findById(id)
                    .orElseThrow(() -> new RuntimeException("Kaynak dosya bulunamadı."));

            if (!sourceArtifact.getOwnerId().equals(ownerId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Bu dosya size ait değil."));
            }


            Object targetIdObj = requestBody.get("targetId");
            String relationType = (String) requestBody.get("type");

            if (targetIdObj == null || relationType == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Target ID ve Relationship Type zorunludur."));
            }

            Long targetId = Long.valueOf(targetIdObj.toString());


            StoreArtifactEntity targetArtifact = artifactRepo.findById(targetId)
                    .orElseThrow(() -> new RuntimeException("Hedef dosya bulunamadı."));


            if (sourceArtifact.getId().equals(targetArtifact.getId())) {
                return ResponseEntity.badRequest().body(Map.of("error", "Dosya kendisine linklenemez."));
            }


            StoreArtifactLinkEntity link = new StoreArtifactLinkEntity();
            link.setSourceArtifact(sourceArtifact);
            link.setTargetArtifact(targetArtifact);
            link.setRelationshipType(relationType);

            StoreArtifactLinkEntity savedLink = linkRepo.save(link);

            return ResponseEntity.ok(savedLink);

        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", ex.getMessage()));
        }
    }


    @GetMapping("/{id}/links")
    public ResponseEntity<?> getArtifactLinks(@PathVariable Long id, Authentication authentication) {
        try {


            if (!artifactRepo.existsById(id)) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Artifact bulunamadı."));
            }

            List<StoreArtifactLinkEntity> links = linkRepo.findBySourceArtifactId(id);
            return ResponseEntity.ok(links);

        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", ex.getMessage()));
        }
    }


    @DeleteMapping("/links/{linkId}")
    public ResponseEntity<?> deleteLink(@PathVariable Long linkId, Authentication authentication) {
        try {
            if (authentication == null || !(authentication.getPrincipal() instanceof CustomUserDetails)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Yetkisiz erişim."));
            }
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
            Long ownerId = userDetails.getId();

            StoreArtifactLinkEntity link = linkRepo.findById(linkId)
                    .orElseThrow(() -> new RuntimeException("Link bulunamadı."));


            if (!link.getSourceArtifact().getOwnerId().equals(ownerId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Bu ilişkiyi silme yetkiniz yok."));
            }

            linkRepo.delete(link);
            return ResponseEntity.ok(Map.of("success", true, "message", "Link silindi."));

        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", ex.getMessage()));
        }
    }




    private static String sha256Hex(byte[] data) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        byte[] digest = md.digest(data);
        StringBuilder sb = new StringBuilder();
        for (byte b : digest) sb.append(String.format("%02x", b));
        return sb.toString();
    }
}
