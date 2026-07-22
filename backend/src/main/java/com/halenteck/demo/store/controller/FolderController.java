package com.halenteck.demo.store.controller;

import com.halenteck.demo.security.CustomUserDetails;
import com.halenteck.demo.store.entity.FolderEntity;
import com.halenteck.demo.store.entity.StoreArtifactEntity;
import com.halenteck.demo.store.repository.FolderRepository;
import com.halenteck.demo.store.repository.StoreArtifactRepo;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/folders")
public class FolderController {

    private final FolderRepository folderRepository;
    private final StoreArtifactRepo artifactRepo;

    public FolderController(FolderRepository folderRepository, StoreArtifactRepo artifactRepo) {
        this.folderRepository = folderRepository;
        this.artifactRepo = artifactRepo;
    }


    @PostMapping
    public ResponseEntity<?> createFolder(@RequestBody Map<String, String> request, Authentication authentication) {
        try {
            if (authentication == null || !(authentication.getPrincipal() instanceof CustomUserDetails)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Yetkisiz erişim."));
            }
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
            Long ownerId = userDetails.getId();

            String name = request.get("name");
            if (name == null || name.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Klasör ismi boş olamaz."));
            }

            if (folderRepository.existsByOwnerIdAndName(ownerId, name)) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "Bu isimde bir klasör zaten var."));
            }

            FolderEntity folder = new FolderEntity();
            folder.setName(name);
            folder.setOwnerId(ownerId);
            FolderEntity savedFolder = folderRepository.save(folder);
            return ResponseEntity.status(HttpStatus.CREATED).body(savedFolder);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }


    @GetMapping
    public ResponseEntity<?> getMyFolders(Authentication authentication) {
        try {
            if (authentication == null || !(authentication.getPrincipal() instanceof CustomUserDetails)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Yetkisiz erişim."));
            }
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
            Long ownerId = userDetails.getId();

            List<FolderEntity> folders = folderRepository.findByOwnerId(ownerId);
            return ResponseEntity.ok(folders);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }


    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteFolder(@PathVariable Long id, Authentication authentication) {
        try {
            if (authentication == null || !(authentication.getPrincipal() instanceof CustomUserDetails)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Yetkisiz erişim."));
            }
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
            Long ownerId = userDetails.getId();

            FolderEntity folder = folderRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Klasör bulunamadı."));

            if (!folder.getOwnerId().equals(ownerId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Bu klasör size ait değil."));
            }





            List<StoreArtifactEntity> allArtifacts = artifactRepo.findAll();

            for (StoreArtifactEntity artifact : allArtifacts) {
                if (artifact.getFolder() != null && artifact.getFolder().getId().equals(id)) {
                    artifact.setFolder(null);
                    artifactRepo.save(artifact);
                }
            }

            folderRepository.delete(folder);
            return ResponseEntity.ok(Map.of("deleted", true, "message", "Klasör silindi, içindeki dosyalar ana dizine taşındı."));

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }
}
