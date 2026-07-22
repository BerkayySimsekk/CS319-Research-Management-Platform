
package com.halenteck.demo.controller;

import com.halenteck.demo.UserRole;
import com.halenteck.demo.audit.StudyAuditAction;
import com.halenteck.demo.dto.ArtifactSummaryDTO;
import com.halenteck.demo.dto.ComparisonTaskDetailDTO;
import com.halenteck.demo.dto.SubmitTaskRequest;
import com.halenteck.demo.dto.TaskResponseDTO;
import com.halenteck.demo.dto.StudyRatingCriterionDTO;
import com.halenteck.demo.entity.ComparisonTaskEntity;
import com.halenteck.demo.entity.StudyStatus;
import com.halenteck.demo.entity.StudyTaskDefinitionEntity;
import com.halenteck.demo.entity.UserEntity;
import com.halenteck.demo.permission.StudyPermissionAction;
import com.halenteck.demo.entity.StudyRatingCriterionEntity;
import com.halenteck.demo.entity.TaskCriterionRatingEntity;
import com.halenteck.demo.repository.ComparisonTaskRepository;
import com.halenteck.demo.repository.StudyRatingCriterionRepository;
import com.halenteck.demo.repository.StudyTaskDefinitionRepository;
import com.halenteck.demo.repository.TaskCriterionRatingRepository;
import com.halenteck.demo.repository.UserRepository;
import com.halenteck.demo.service.StudyAuditService;
import com.halenteck.demo.service.StudyPermissionService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.List;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    private final ComparisonTaskRepository taskRepository;
    private final UserRepository userRepository;
    private final StudyAuditService studyAuditService;
    private final StudyPermissionService studyPermissionService;
    private final StudyRatingCriterionRepository criterionRepository;
    private final TaskCriterionRatingRepository taskCriterionRatingRepository;
    private final StudyTaskDefinitionRepository studyTaskDefinitionRepository;

    public TaskController(ComparisonTaskRepository taskRepository,
                          UserRepository userRepository,
                          StudyAuditService studyAuditService,
                          StudyPermissionService studyPermissionService,
                          StudyRatingCriterionRepository criterionRepository,
                          TaskCriterionRatingRepository taskCriterionRatingRepository,
                          StudyTaskDefinitionRepository studyTaskDefinitionRepository) {
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
        this.studyAuditService = studyAuditService;
        this.studyPermissionService = studyPermissionService;
        this.criterionRepository = criterionRepository;
        this.taskCriterionRatingRepository = taskCriterionRatingRepository;
        this.studyTaskDefinitionRepository = studyTaskDefinitionRepository;
    }

    @GetMapping("/my-tasks")
    public ResponseEntity<List<TaskResponseDTO>> getMyTasks(Principal principal) {
        UserEntity participant = userRepository.findByName(principal.getName())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        List<ComparisonTaskEntity> tasks = taskRepository.findByParticipant(participant).stream()
                .filter(task -> task.getStudy().getStatus() == StudyStatus.PUBLISHED && task.getStudyVersion() != null)
                .collect(Collectors.toList());

        List<TaskResponseDTO> taskDTOs = tasks.stream()
                .map(task -> {

                    String uploaderAName = userRepository.findById(task.getArtifactA().getOwnerId())
                            .map(UserEntity::getName)
                            .orElse(null);
                    String uploaderBName = userRepository.findById(task.getArtifactB().getOwnerId())
                            .map(UserEntity::getName)
                            .orElse(null);

                    String uploaderCName = null;
                    if (task.getArtifactC() != null) {
                        uploaderCName = userRepository.findById(task.getArtifactC().getOwnerId())
                                .map(UserEntity::getName)
                                .orElse(null);
                    }

                    return new TaskResponseDTO(
                            task.getId(),
                            task.getStudy().getId(),
                            task.getStudy().getTitle(),
                            task.getStudy().getDescription(),
                            task.getStudy().isBlinded(),
                            task.getStatus(),
                            task.getCreatedAt(),
                            new ArtifactSummaryDTO(
                                    task.getArtifactA().getId(),
                                    task.getArtifactA().getFileName(),
                                    uploaderAName
                            ),
                            new ArtifactSummaryDTO(
                                    task.getArtifactB().getId(),
                                    task.getArtifactB().getFileName(),
                                    uploaderBName
                            ),
                            task.getArtifactC() != null ? new ArtifactSummaryDTO(
                                    task.getArtifactC().getId(),
                                    task.getArtifactC().getFileName(),
                                    uploaderCName
                            ) : null
                    );
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(taskDTOs);
    }

    @GetMapping("/{taskId}")
    public ResponseEntity<ComparisonTaskDetailDTO> getTaskDetails(
            @PathVariable Long taskId,
            Principal principal) {

        UserEntity user = userRepository.findByName(principal.getName())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        ComparisonTaskEntity task = taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found"));


        boolean isParticipant = task.getParticipant().getId().equals(user.getId());
        boolean isResearcherReviewerOrAdmin = (user.getRole() == UserRole.RESEARCHER || user.getRole() == UserRole.REVIEWER || user.getRole() == UserRole.ADMIN);

        if (!isParticipant && !isResearcherReviewerOrAdmin) {
            throw new AccessDeniedException("You do not have access to this task.");
        }


        if (isResearcherReviewerOrAdmin && !isParticipant) {
            if (!studyPermissionService.hasPermission(task.getStudy(), user, StudyPermissionAction.VIEW)) {
                throw new AccessDeniedException("You do not have permission to view tasks for this study.");
            }
        }


        List<StudyRatingCriterionDTO> criteria = findTaskDefinitionCriteria(task);

        return ResponseEntity.ok(new ComparisonTaskDetailDTO(task, userRepository, taskCriterionRatingRepository, criteria));
    }




    @PostMapping("/{taskId}/save-draft")
    public ResponseEntity<ComparisonTaskDetailDTO> saveTaskDraft(
            @PathVariable Long taskId,
            @RequestBody SubmitTaskRequest request,
            Principal principal) {

        UserEntity participant = userRepository.findByName(principal.getName())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        ComparisonTaskEntity task = taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found"));

        if (!task.getParticipant().getId().equals(participant.getId())) {
            throw new AccessDeniedException("This task is not assigned to you.");
        }


        if (task.getStatus() == ComparisonTaskEntity.TaskStatus.COMPLETED) {
            throw new IllegalStateException("Cannot edit a completed task.");
        }


        task.setAnnotations(request.annotations());

        if (request.commentA() != null) task.setCommentA(request.commentA());
        if (request.highlightDataA() != null) task.setHighlightDataA(request.highlightDataA());

        if (request.commentB() != null) task.setCommentB(request.commentB());
        if (request.highlightDataB() != null) task.setHighlightDataB(request.highlightDataB());

        if (request.commentC() != null) task.setCommentC(request.commentC());
        if (request.highlightDataC() != null) task.setHighlightDataC(request.highlightDataC());


        if (request.criterionRatingsA() != null) {
            saveCriterionRatings(task, request.criterionRatingsA(), "A");
        }
        if (request.criterionRatingsB() != null) {
            saveCriterionRatings(task, request.criterionRatingsB(), "B");
        }
        if (request.criterionRatingsC() != null) {
            saveCriterionRatings(task, request.criterionRatingsC(), "C");
        }


        if (task.getStatus() == ComparisonTaskEntity.TaskStatus.PENDING) {
            task.setStatus(ComparisonTaskEntity.TaskStatus.IN_PROGRESS);
        }

        taskRepository.save(task);



        List<StudyRatingCriterionDTO> criteria = findTaskDefinitionCriteria(task);
        return ResponseEntity.ok(new ComparisonTaskDetailDTO(task, userRepository, taskCriterionRatingRepository, criteria));
    }

    @PostMapping("/{taskId}/complete")
    public ResponseEntity<ComparisonTaskDetailDTO> completeTask(
            @PathVariable Long taskId,
            @RequestBody SubmitTaskRequest request,
            Principal principal) {

        UserEntity participant = userRepository.findByName(principal.getName())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        ComparisonTaskEntity task = taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found"));

        if (!task.getParticipant().getId().equals(participant.getId())) {
            throw new AccessDeniedException("This task is not assigned to you.");
        }

        task.setAnnotations(request.annotations());


        if (request.clarityA() != null) task.setClarityA(request.clarityA());
        if (request.relevanceA() != null) task.setRelevanceA(request.relevanceA());
        if (request.accuracyA() != null) task.setAccuracyA(request.accuracyA());
        if (request.commentA() != null) task.setCommentA(request.commentA());
        if (request.highlightDataA() != null) task.setHighlightDataA(request.highlightDataA());

        if (request.clarityB() != null) task.setClarityB(request.clarityB());
        if (request.relevanceB() != null) task.setRelevanceB(request.relevanceB());
        if (request.accuracyB() != null) task.setAccuracyB(request.accuracyB());
        if (request.commentB() != null) task.setCommentB(request.commentB());
        if (request.highlightDataB() != null) task.setHighlightDataB(request.highlightDataB());

        if (request.clarityC() != null) task.setClarityC(request.clarityC());
        if (request.relevanceC() != null) task.setRelevanceC(request.relevanceC());
        if (request.accuracyC() != null) task.setAccuracyC(request.accuracyC());
        if (request.commentC() != null) task.setCommentC(request.commentC());
        if (request.highlightDataC() != null) task.setHighlightDataC(request.highlightDataC());


        if (request.criterionRatingsA() != null) {
            saveCriterionRatings(task, request.criterionRatingsA(), "A");
        }
        if (request.criterionRatingsB() != null) {
            saveCriterionRatings(task, request.criterionRatingsB(), "B");
        }
        if (request.criterionRatingsC() != null) {
            saveCriterionRatings(task, request.criterionRatingsC(), "C");
        }

        task.setStatus(ComparisonTaskEntity.TaskStatus.COMPLETED);
        task.setCompletedAt(LocalDateTime.now());

        taskRepository.save(task);
        studyAuditService.record(task.getStudy(), participant, StudyAuditAction.TASK_COMPLETED, Map.of(
                "taskId", task.getId(),
                "studyVersion", task.getStudyVersion() != null ? task.getStudyVersion().getVersionNumber() : null
        ));

       List<StudyRatingCriterionDTO> criteria = findTaskDefinitionCriteria(task);
       return ResponseEntity.ok(new ComparisonTaskDetailDTO(task, userRepository, taskCriterionRatingRepository, criteria));
    }

    private List<StudyRatingCriterionDTO> findTaskDefinitionCriteria(ComparisonTaskEntity task) {

        List<StudyTaskDefinitionEntity> definitions = studyTaskDefinitionRepository.findByStudyOrderBySortOrderAscCreatedAtAsc(task.getStudy());


        StudyTaskDefinitionEntity matchingDefinition = definitions.stream()
                .filter(def -> {
                    if (def.getArtifacts().size() < 2) return false;
                    List<Long> artifactIds = def.getArtifacts().stream()
                            .map(a -> a.getArtifact().getId())
                            .collect(java.util.stream.Collectors.toList());

                    boolean matches = artifactIds.contains(task.getArtifactA().getId()) &&
                                      artifactIds.contains(task.getArtifactB().getId());

                    if (task.getArtifactC() != null) {
                        matches = matches && artifactIds.contains(task.getArtifactC().getId());
                    }
                    return matches;
                })
                .findFirst()
                .orElse(null);

        if (matchingDefinition != null && matchingDefinition.getRatingCriteria() != null) {
            return matchingDefinition.getRatingCriteria().stream()
                    .map(mapping -> {
                        StudyRatingCriterionEntity criterion = mapping.getRatingCriterion();
                        return new StudyRatingCriterionDTO(
                                criterion.getId(),
                                criterion.getName(),
                                criterion.getDescription(),
                                criterion.getWeight(),
                                criterion.getSortOrder(),
                                criterion.getCreatedAt(),
                                criterion.getUpdatedAt()
                        );
                    })
                    .collect(java.util.stream.Collectors.toList());
        }


        return criterionRepository.findByStudyOrderBySortOrderAscCreatedAtAsc(task.getStudy()).stream()
                .map(criterion -> new StudyRatingCriterionDTO(
                        criterion.getId(),
                        criterion.getName(),
                        criterion.getDescription(),
                        criterion.getWeight(),
                        criterion.getSortOrder(),
                        criterion.getCreatedAt(),
                        criterion.getUpdatedAt()
                ))
                .collect(java.util.stream.Collectors.toList());
    }

    private void saveCriterionRatings(ComparisonTaskEntity task, Map<Long, Double> ratings, String artifactSide) {
        for (Map.Entry<Long, Double> entry : ratings.entrySet()) {
            Long criterionId = entry.getKey();
            Double rating = entry.getValue();

            if (rating == null || rating < 0 || rating > 5) {
                continue;
            }

            StudyRatingCriterionEntity criterion = criterionRepository.findById(criterionId)
                    .orElse(null);

            if (criterion == null || !criterion.getStudy().getId().equals(task.getStudy().getId())) {
                continue;
            }

            TaskCriterionRatingEntity existing = taskCriterionRatingRepository
                    .findByTaskAndCriterionAndArtifactSide(task, criterion, artifactSide)
                    .orElse(null);

            if (existing != null) {
                existing.setRating(rating);
                taskCriterionRatingRepository.save(existing);
            } else {
                TaskCriterionRatingEntity newRating = new TaskCriterionRatingEntity(
                        task, criterion, artifactSide, rating);
                taskCriterionRatingRepository.save(newRating);
            }
        }
    }
}
