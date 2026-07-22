
package com.halenteck.demo.service;
import com.halenteck.demo.QuizType;

import com.halenteck.demo.QuestionType;
import com.halenteck.demo.dto.*;
import com.halenteck.demo.entity.*;
import com.halenteck.demo.permission.StudyPermissionAction;
import com.halenteck.demo.repository.*;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class QuizService {

    private final QuizRepository quizRepository;
    private final UserRepository userRepository;
    private final StudyRepository studyRepository;
    private final QuizSubmissionRepository submissionRepository;
    private final QuestionRepository questionRepository;
    private final OptionRepository optionRepository;
    private final AnswerRepository answerRepository;
    private final StudyPermissionService studyPermissionService;
    private final StudyVersionRepository studyVersionRepository;
    private final ParticipantStudyEnrollmentRepository participantEnrollmentRepository;
    private final ComparisonTaskRepository taskRepository;
    private final StudyTaskDefinitionRepository studyTaskDefinitionRepository;
    private final NotificationService notificationService;


    public QuizService(QuizRepository quizRepository,
                       UserRepository userRepository,
                       StudyRepository studyRepository,
                       QuizSubmissionRepository submissionRepository,
                       QuestionRepository questionRepository,
                       OptionRepository optionRepository,
                       AnswerRepository answerRepository,
                       StudyPermissionService studyPermissionService,
                       StudyVersionRepository studyVersionRepository,
                       ParticipantStudyEnrollmentRepository participantEnrollmentRepository,
                       ComparisonTaskRepository taskRepository,
                       StudyTaskDefinitionRepository studyTaskDefinitionRepository,
                       NotificationService notificationService) {
        this.quizRepository = quizRepository;
        this.userRepository = userRepository;
        this.studyRepository = studyRepository;
        this.submissionRepository = submissionRepository;
        this.questionRepository = questionRepository;
        this.optionRepository = optionRepository;
        this.answerRepository = answerRepository;
        this.studyPermissionService = studyPermissionService;
        this.studyVersionRepository = studyVersionRepository;
        this.participantEnrollmentRepository = participantEnrollmentRepository;
        this.taskRepository = taskRepository;
        this.studyTaskDefinitionRepository = studyTaskDefinitionRepository;
        this.notificationService = notificationService;
    }



    @Transactional
    public QuizEntity createQuiz(CreateQuizRequest request, Principal principal) {

        UserEntity creator = userRepository.findByName(principal.getName())
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + principal.getName()));

        QuizType type = request.type() != null ? request.type() : QuizType.COMPETENCY_QUIZ;

        QuizEntity newQuiz = new QuizEntity(
                request.title(),
                request.description(),
                creator,
                request.durationInMinutes(),
                type
        );

        for (CreateQuestionDTO questionDTO : request.questions()) {
            QuestionEntity newQuestion = new QuestionEntity(
                    newQuiz,
                    questionDTO.questionText(),
                    questionDTO.questionType()
            );

            if (questionDTO.questionType() == QuestionType.MULTIPLE_CHOICE && questionDTO.options() != null) {
                for (CreateOptionDTO optionDTO : questionDTO.options()) {
                    OptionEntity newOption = new OptionEntity(
                            newQuestion,
                            optionDTO.optionText(),
                            optionDTO.isCorrect()
                    );
                    newQuestion.addOption(newOption);
                }
            }
            newQuiz.addQuestion(newQuestion);
        }
        return quizRepository.save(newQuiz);
    }

    @Transactional(readOnly = true)
    public List<QuizSummaryDTO> findQuizzesByCreator(Principal principal) {

        UserEntity creator = userRepository.findByName(principal.getName())
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + principal.getName()));

        List<QuizEntity> quizzes = quizRepository.findByCreator(creator);

        return quizzes.stream()
                .map(this::convertToSummaryDTO)
                .collect(Collectors.toList());
    }



    @Transactional
    public QuizTakeDTO getQuizForParticipant(Long studyId, Principal principal) {

        UserEntity participant = userRepository.findByName(principal.getName())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
        StudyEntity study = studyRepository.findById(studyId)
                .orElseThrow(() -> new RuntimeException("Study not found"));

        if (study.getStatus() != StudyStatus.PUBLISHED || study.getLatestPublishedVersionNumber() == null) {
            throw new RuntimeException("This study has not been published yet.");
        }

        StudyVersionEntity currentVersion = studyVersionRepository
                .findByStudyAndVersionNumber(study, study.getLatestPublishedVersionNumber())
                .orElseThrow(() -> new RuntimeException("Published study version not found."));

        QuizEntity quiz = study.getCompetencyQuiz();
        if (quiz == null) {
            throw new RuntimeException("No competency quiz assigned to this study.");
        }


        Optional<ParticipantStudyEnrollmentEntity> enrollmentOpt =
                participantEnrollmentRepository.findByStudyAndParticipant(study, participant);
        boolean isRetakeAllowed = enrollmentOpt.isPresent() &&
                enrollmentOpt.get().getStatus() == ParticipantEnrollmentStatus.QUIZ_FAILED;


        Optional<QuizSubmissionEntity> submittedOpt = submissionRepository
                .findFirstByQuizAndParticipantAndSubmittedAtIsNotNullOrderBySubmittedAtDesc(quiz, participant);
        if (submittedOpt.isPresent() && !isRetakeAllowed) {
            throw new RuntimeException("You have already completed this quiz.");
        }



        List<QuizSubmissionEntity> existingSubmissions = submissionRepository.findAllByQuizAndParticipant(quiz, participant);
        QuizSubmissionEntity submission = existingSubmissions.stream()
                .filter(s -> s.getSubmittedAt() == null)
                .findFirst()
                .orElseGet(() -> {

                    QuizSubmissionEntity newSubmission = new QuizSubmissionEntity(quiz, participant);
                    return submissionRepository.save(newSubmission);
                });

        if (submission.getStudyVersion() == null) {
            submission.setStudyVersion(currentVersion);
            submissionRepository.save(submission);
        }

        return convertToQuizTakeDTO(quiz);
    }

    @Transactional
    public Map<String, Object> submitQuiz(Long studyId, QuizSubmitRequest request, Principal principal) {

        UserEntity participant = userRepository.findByName(principal.getName())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
        StudyEntity study = studyRepository.findById(studyId)
                .orElseThrow(() -> new RuntimeException("Study not found"));

        if (study.getStatus() != StudyStatus.PUBLISHED || study.getLatestPublishedVersionNumber() == null) {
            throw new RuntimeException("This study has not been published yet.");
        }

        QuizEntity quiz = study.getCompetencyQuiz();
        if (quiz == null) {
            throw new RuntimeException("No quiz assigned to this study.");
        }


        List<QuizSubmissionEntity> submissions = submissionRepository.findAllByQuizAndParticipant(quiz, participant);
        QuizSubmissionEntity submission = submissions.stream()
                .filter(s -> s.getSubmittedAt() == null)
                .findFirst()
                .orElseThrow(() -> {

                    Optional<QuizSubmissionEntity> submitted = submissions.stream()
                            .filter(s -> s.getSubmittedAt() != null)
                            .findFirst();
                    if (submitted.isPresent()) {
                        return new RuntimeException("Quiz already submitted.");
                    }
                    return new RuntimeException("Quiz not started. Please 'GET' the quiz first.");
                });

        if (submission.getSubmittedAt() != null) {
            throw new RuntimeException("Quiz already submitted.");
        }

        if (submission.getStudyVersion() == null && study.getLatestPublishedVersionNumber() != null) {
            StudyVersionEntity version = studyVersionRepository
                    .findByStudyAndVersionNumber(study, study.getLatestPublishedVersionNumber())
                    .orElseThrow(() -> new RuntimeException("Published study version not found."));
            submission.setStudyVersion(version);
        }

        Integer duration = quiz.getDurationInMinutes();
        if (duration != null) {
            LocalDateTime deadline = submission.getStartedAt().plusMinutes(duration);
            if (LocalDateTime.now().isAfter(deadline)) {
                throw new RuntimeException("Time limit exceeded. Submission rejected.");
            }
        }

        double totalCorrect = 0;
        int totalGradableQuestions = 0;

        for (AnswerSubmitDTO answerDTO : request.answers()) {
            QuestionEntity question = questionRepository.findById(answerDTO.questionId())
                    .orElseThrow(() -> new RuntimeException("Question not found: " + answerDTO.questionId()));

            AnswerEntity answerEntity;

            if (question.getQuestionType() == QuestionType.MULTIPLE_CHOICE) {
                totalGradableQuestions++;
                OptionEntity selectedOption = optionRepository.findById(answerDTO.selectedOptionId())
                        .orElseThrow(() -> new RuntimeException("Option not found: " + answerDTO.selectedOptionId()));

                if (selectedOption.isCorrect()) {
                    totalCorrect++;
                }
                answerEntity = new AnswerEntity(submission, question, selectedOption);

            } else {
                answerEntity = new AnswerEntity(submission, question, answerDTO.answerText());
            }
            answerRepository.save(answerEntity);
        }

        final double finalScore;
        if (totalGradableQuestions > 0) {
            finalScore = (totalCorrect / totalGradableQuestions) * 100.0;
        } else {
            finalScore = 0.0;
        }

        submission.setScore(finalScore);
        submission.setSubmittedAt(LocalDateTime.now());
        submissionRepository.save(submission);


        final double scoreForEnrollment = finalScore;
        participantEnrollmentRepository.findByStudyAndParticipant(study, participant)
                .ifPresent(enrollment -> {
                    ParticipantEnrollmentStatus currentStatus = enrollment.getStatus();
                    boolean isPendingQuiz = currentStatus == ParticipantEnrollmentStatus.PENDING_QUIZ;
                    boolean isPendingBoth = currentStatus == ParticipantEnrollmentStatus.PENDING_QUIZ_AND_QUESTIONNAIRE;
                    boolean isRetake = currentStatus == ParticipantEnrollmentStatus.QUIZ_FAILED;

                    if (isPendingQuiz || isPendingBoth || isRetake) {

                        double passingScore = 60.0;
                        enrollment.setQuizSubmission(submission);
                        enrollment.setQuizCompletedAt(LocalDateTime.now());

                        if (scoreForEnrollment >= passingScore) {

                            QuizEntity questionnaire = study.getBackgroundQuestionnaire();
                            boolean questionnaireCompleted = false;
                            if (questionnaire != null) {
                                Optional<QuizSubmissionEntity> questionnaireSubmissionOpt = submissionRepository
                                        .findFirstByQuizAndParticipantAndSubmittedAtIsNotNullOrderBySubmittedAtDesc(questionnaire, participant);
                                questionnaireCompleted = questionnaireSubmissionOpt.isPresent();
                            }

                            if (isPendingBoth) {

                                enrollment.setStatus(ParticipantEnrollmentStatus.PENDING_QUESTIONNAIRE);
                                participantEnrollmentRepository.save(enrollment);
                            } else if (isPendingQuiz || isRetake) {

                                if (questionnaire != null && !questionnaireCompleted) {

                                    enrollment.setStatus(ParticipantEnrollmentStatus.PENDING_QUESTIONNAIRE);
                                    participantEnrollmentRepository.save(enrollment);
                                } else {

                                    enrollment.setStatus(ParticipantEnrollmentStatus.QUIZ_PASSED);
                                    participantEnrollmentRepository.save(enrollment);

                                    assignTasksToParticipant(study, participant);
                                }
                            }
                        } else {

                            enrollment.setStatus(ParticipantEnrollmentStatus.QUIZ_FAILED);
                            participantEnrollmentRepository.save(enrollment);
                        }
                    }
                });

        return Map.of(
                "message", "Quiz submitted successfully!",
                "score", finalScore,
                "correctAnswers", (int)totalCorrect,
                "totalQuestions", totalGradableQuestions
        );
    }




    @Transactional
    public QuizTakeDTO getQuestionnaireForParticipant(Long studyId, Principal principal) {
        UserEntity participant = userRepository.findByName(principal.getName())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
        StudyEntity study = studyRepository.findById(studyId)
                .orElseThrow(() -> new RuntimeException("Study not found"));

        QuizEntity questionnaire = study.getBackgroundQuestionnaire();
        if (questionnaire == null) {
            throw new RuntimeException("No background questionnaire assigned to this study.");
        }


        Optional<QuizSubmissionEntity> submittedOpt = submissionRepository
                .findFirstByQuizAndParticipantAndSubmittedAtIsNotNullOrderBySubmittedAtDesc(questionnaire, participant);
        if (submittedOpt.isPresent()) {
            throw new RuntimeException("You have already completed this questionnaire.");
        }


        List<QuizSubmissionEntity> existingSubmissions = submissionRepository.findAllByQuizAndParticipant(questionnaire, participant);
        QuizSubmissionEntity submission = existingSubmissions.stream()
                .filter(s -> s.getSubmittedAt() == null)
                .findFirst()
                .orElseGet(() -> {
                    QuizSubmissionEntity newSubmission = new QuizSubmissionEntity(questionnaire, participant);
                    return submissionRepository.save(newSubmission);
                });

        return convertToQuizTakeDTO(questionnaire);
    }




    @Transactional
    public Map<String, Object> submitQuestionnaire(Long studyId, QuizSubmitRequest request, Principal principal) {
        UserEntity participant = userRepository.findByName(principal.getName())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
        StudyEntity study = studyRepository.findById(studyId)
                .orElseThrow(() -> new RuntimeException("Study not found"));

        QuizEntity questionnaire = study.getBackgroundQuestionnaire();
        if (questionnaire == null) {
            throw new RuntimeException("No questionnaire assigned to this study.");
        }


        List<QuizSubmissionEntity> submissions = submissionRepository.findAllByQuizAndParticipant(questionnaire, participant);
        QuizSubmissionEntity submission = submissions.stream()
                .filter(s -> s.getSubmittedAt() == null)
                .findFirst()
                .orElseThrow(() -> {
                    Optional<QuizSubmissionEntity> submitted = submissions.stream()
                            .filter(s -> s.getSubmittedAt() != null)
                            .findFirst();
                    if (submitted.isPresent()) {
                        return new RuntimeException("Questionnaire already submitted.");
                    }
                    return new RuntimeException("Questionnaire not started. Please 'GET' the questionnaire first.");
                });

        if (submission.getSubmittedAt() != null) {
            throw new RuntimeException("Questionnaire already submitted.");
        }


        for (AnswerSubmitDTO answerDTO : request.answers()) {
            QuestionEntity question = questionRepository.findById(answerDTO.questionId())
                    .orElseThrow(() -> new RuntimeException("Question not found: " + answerDTO.questionId()));

            AnswerEntity answerEntity;

            if (question.getQuestionType() == QuestionType.MULTIPLE_CHOICE) {
                OptionEntity selectedOption = optionRepository.findById(answerDTO.selectedOptionId())
                        .orElseThrow(() -> new RuntimeException("Option not found: " + answerDTO.selectedOptionId()));
                answerEntity = new AnswerEntity(submission, question, selectedOption);
            } else {
                answerEntity = new AnswerEntity(submission, question, answerDTO.answerText());
            }
            answerRepository.save(answerEntity);
        }


        submission.setScore(100.0);
        submission.setSubmittedAt(LocalDateTime.now());
        submissionRepository.save(submission);


        participantEnrollmentRepository.findByStudyAndParticipant(study, participant)
                .ifPresent(enrollment -> {
                    ParticipantEnrollmentStatus currentStatus = enrollment.getStatus();
                    enrollment.setQuestionnaireSubmission(submission);
                    enrollment.setQuestionnaireCompletedAt(LocalDateTime.now());

                    if (currentStatus == ParticipantEnrollmentStatus.PENDING_QUESTIONNAIRE) {

                        enrollment.setStatus(ParticipantEnrollmentStatus.ENROLLED);
                        participantEnrollmentRepository.save(enrollment);

                        assignTasksToParticipant(study, participant);
                    } else if (currentStatus == ParticipantEnrollmentStatus.PENDING_QUIZ_AND_QUESTIONNAIRE) {

                        enrollment.setStatus(ParticipantEnrollmentStatus.PENDING_QUIZ);
                        participantEnrollmentRepository.save(enrollment);
                    } else {
                        participantEnrollmentRepository.save(enrollment);
                    }
                });

        return Map.of(
                "message", "Questionnaire submitted successfully!",
                "answersRecorded", request.answers().size()
        );
    }

    @Transactional
    private void assignTasksToParticipant(StudyEntity study, UserEntity participant) {

        List<com.halenteck.demo.entity.StudyTaskDefinitionEntity> taskDefinitions = studyTaskDefinitionRepository
                .findByStudyOrderBySortOrderAscCreatedAtAsc(study);

        if (taskDefinitions.isEmpty()) {
            return;
        }


        com.halenteck.demo.entity.StudyVersionEntity currentVersion = null;
        if (study.getLatestPublishedVersionNumber() != null) {
            currentVersion = studyVersionRepository.findByStudyAndVersionNumber(
                    study, study.getLatestPublishedVersionNumber()).orElse(null);
        }

        List<com.halenteck.demo.entity.ComparisonTaskEntity> newlyCreatedTasks = new ArrayList<>();

        for (com.halenteck.demo.entity.StudyTaskDefinitionEntity definition : taskDefinitions) {
            List<com.halenteck.demo.entity.StudyTaskArtifactEntity> artifacts = definition.getArtifacts();
            if (artifacts.size() >= 2) {

                for (int i = 0; i < artifacts.size(); i++) {
                    for (int j = i + 1; j < artifacts.size(); j++) {
                        com.halenteck.demo.entity.ArtifactEntity artifactA = artifacts.get(i).getArtifact();
                        com.halenteck.demo.entity.ArtifactEntity artifactB = artifacts.get(j).getArtifact();


                        boolean exists = taskRepository.findByParticipant(participant).stream()
                                .anyMatch(task -> task.getStudy().getId().equals(study.getId())
                                        && ((task.getArtifactA().getId().equals(artifactA.getId())
                                                && task.getArtifactB().getId().equals(artifactB.getId()))
                                        || (task.getArtifactA().getId().equals(artifactB.getId())
                                                && task.getArtifactB().getId().equals(artifactA.getId()))));

                        if (!exists) {
                            com.halenteck.demo.entity.ComparisonTaskEntity newTask = new com.halenteck.demo.entity.ComparisonTaskEntity(
                                    study, participant, artifactA, artifactB);
                            if (currentVersion != null) {
                                newTask.setStudyVersion(currentVersion);
                            }
                            com.halenteck.demo.entity.ComparisonTaskEntity savedTask = taskRepository.save(newTask);
                            newlyCreatedTasks.add(savedTask);
                        }
                    }
                }
            }
        }


        if (!newlyCreatedTasks.isEmpty()) {
            if (newlyCreatedTasks.size() == 1) {
                notificationService.sendTaskAssignmentNotification(participant, study, newlyCreatedTasks.get(0));
            } else {
                notificationService.sendMultipleTasksAssignmentNotification(participant, study, newlyCreatedTasks);
            }
        }
    }









    @Transactional(readOnly = true)
    public List<SubmissionSummaryDTO> getSubmissionsForStudy(Long studyId, Principal principal) {

        UserEntity creator = userRepository.findByName(principal.getName())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
        StudyEntity study = studyRepository.findById(studyId)
                .orElseThrow(() -> new RuntimeException("Study not found"));

        studyPermissionService.requirePermission(
                study,
                creator,
                StudyPermissionAction.EXPORT,
                "You do not have permission to view submissions for this study."
        );


        QuizEntity quiz = study.getCompetencyQuiz();
        if (quiz == null) {

            return List.of();
        }


        List<QuizSubmissionEntity> submissions = submissionRepository.findByQuiz(quiz);


        return submissions.stream()
                .filter(sub -> sub.getSubmittedAt() != null)
                .map(this::convertToSubmissionSummaryDTO)
                .collect(Collectors.toList());
    }




    private QuizSummaryDTO convertToSummaryDTO(QuizEntity quiz) {
        return new QuizSummaryDTO(
                quiz.getId(),
                quiz.getTitle(),
                quiz.getDescription(),
                quiz.getDurationInMinutes(),
                quiz.getCreatedAt(),
                quiz.getQuestions().size(),
                quiz.getType()
        );
    }




    @Transactional(readOnly = true)
    public QuizTakeDTO getQuizDetailsForResearcher(Long quizId, Principal principal) {
        UserEntity researcher = userRepository.findByName(principal.getName())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        QuizEntity quiz = quizRepository.findById(quizId)
                .orElseThrow(() -> new RuntimeException("Quiz not found"));


        if (!quiz.getCreator().getId().equals(researcher.getId())) {
            throw new RuntimeException("You don't have permission to view this quiz");
        }

        return convertToQuizTakeDTO(quiz);
    }




    @Transactional(readOnly = true)
    public QuizEditDTO getQuizForEdit(Long quizId, Principal principal) {
        UserEntity researcher = userRepository.findByName(principal.getName())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        QuizEntity quiz = quizRepository.findById(quizId)
                .orElseThrow(() -> new RuntimeException("Quiz not found"));


        if (!quiz.getCreator().getId().equals(researcher.getId())) {
            throw new RuntimeException("You don't have permission to edit this quiz");
        }


        quiz.getQuestions().size();
        quiz.getQuestions().forEach(question -> {
            if (question.getQuestionType() == QuestionType.MULTIPLE_CHOICE) {
                question.getOptions().size();
            }
        });

        return convertToQuizEditDTO(quiz);
    }




    @Transactional(readOnly = true)
    public boolean canEditQuiz(Long quizId, Principal principal) {
        UserEntity researcher = userRepository.findByName(principal.getName())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        QuizEntity quiz = quizRepository.findById(quizId)
                .orElseThrow(() -> new RuntimeException("Quiz not found"));


        if (!quiz.getCreator().getId().equals(researcher.getId())) {
            return false;
        }


        List<QuizSubmissionEntity> submissions = submissionRepository.findByQuiz(quiz);
        return submissions.isEmpty();
    }




    @Transactional
    public QuizEntity updateQuiz(Long quizId, UpdateQuizRequest request, Principal principal) {
        UserEntity researcher = userRepository.findByName(principal.getName())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        QuizEntity quiz = quizRepository.findById(quizId)
                .orElseThrow(() -> new RuntimeException("Quiz not found"));


        if (!quiz.getCreator().getId().equals(researcher.getId())) {
            throw new RuntimeException("You don't have permission to update this quiz");
        }


        List<QuizSubmissionEntity> submissions = submissionRepository.findByQuiz(quiz);
        boolean hasSubmissions = !submissions.isEmpty();


        if (request.title() != null && !request.title().trim().isEmpty()) {
            quiz.setTitle(request.title());
        }
        if (request.description() != null) {
            quiz.setDescription(request.description());
        }
        if (request.durationInMinutes() != null) {
            quiz.setDurationInMinutes(request.durationInMinutes());
        }
        if (request.type() != null) {
            quiz.setType(request.type());
        }



        if (request.questions() != null && !hasSubmissions) {



            List<QuestionEntity> existingQuestions = new ArrayList<>(quiz.getQuestions());
            quiz.getQuestions().clear();
            questionRepository.deleteAll(existingQuestions);


            for (CreateQuestionDTO questionDTO : request.questions()) {
                QuestionEntity newQuestion = new QuestionEntity(
                        quiz,
                        questionDTO.questionText(),
                        questionDTO.questionType()
                );

                if (questionDTO.questionType() == QuestionType.MULTIPLE_CHOICE && questionDTO.options() != null) {
                    for (CreateOptionDTO optionDTO : questionDTO.options()) {
                        OptionEntity newOption = new OptionEntity(
                                newQuestion,
                                optionDTO.optionText(),
                                optionDTO.isCorrect()
                        );
                        newQuestion.addOption(newOption);
                    }
                }
                quiz.addQuestion(newQuestion);
            }
        } else if (request.questions() != null && hasSubmissions) {

            throw new RuntimeException("Cannot update questions or options for a quiz that has submissions. " +
                    "You can only update the title, description, and duration. " +
                    "To modify questions, create a new quiz.");
        }

        return quizRepository.save(quiz);
    }

    private QuizTakeDTO convertToQuizTakeDTO(QuizEntity quiz) {

        List<QuizQuestionDTO> questionDTOs = quiz.getQuestions().stream()
                .map(question -> {
                    List<QuizOptionDTO> optionDTOs = question.getOptions().stream()
                            .map(option -> new QuizOptionDTO(
                                    option.getId(),
                                    option.getOptionText()
                            ))
                            .collect(Collectors.toList());

                    return new QuizQuestionDTO(
                            question.getId(),
                            question.getQuestionText(),
                            question.getQuestionType(),
                            optionDTOs
                    );
                })
                .collect(Collectors.toList());

        return new QuizTakeDTO(
                quiz.getId(),
                quiz.getTitle(),
                quiz.getDescription(),
                quiz.getDurationInMinutes(),
                questionDTOs
        );
    }




    private QuizEditDTO convertToQuizEditDTO(QuizEntity quiz) {
        List<QuizEditQuestionDTO> questionDTOs = quiz.getQuestions().stream()
                .map(question -> {
                    List<QuizEditOptionDTO> optionDTOs = question.getOptions().stream()
                            .map(option -> new QuizEditOptionDTO(
                                    option.getId(),
                                    option.getOptionText(),
                                    option.isCorrect()
                            ))
                            .collect(Collectors.toList());

                    return new QuizEditQuestionDTO(
                            question.getId(),
                            question.getQuestionText(),
                            question.getQuestionType(),
                            optionDTOs
                    );
                })
                .collect(Collectors.toList());

        return new QuizEditDTO(
                quiz.getId(),
                quiz.getTitle(),
                quiz.getDescription(),
                quiz.getDurationInMinutes(),
                quiz.getType(),
                questionDTOs
        );
    }




    private SubmissionSummaryDTO convertToSubmissionSummaryDTO(QuizSubmissionEntity submission) {
        UserEntity participant = submission.getParticipant();
        return new SubmissionSummaryDTO(
                submission.getId(),
                participant.getId(),
                participant.getName(),
                submission.getScore(),
                submission.getSubmittedAt()
        );
    }
}