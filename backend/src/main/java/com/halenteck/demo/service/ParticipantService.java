
package com.halenteck.demo.service;

import com.halenteck.demo.QuizType;
import com.halenteck.demo.UserRole;
import com.halenteck.demo.dto.ParticipantFilterRequestDTO;
import com.halenteck.demo.dto.ParticipantWithScoresDTO;
import com.halenteck.demo.entity.*;
import com.halenteck.demo.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class ParticipantService {

    private final UserRepository userRepository;
    private final QuizSubmissionRepository submissionRepository;
    private final AnswerRepository answerRepository;

    public ParticipantService(UserRepository userRepository,
                             QuizSubmissionRepository submissionRepository,
                             AnswerRepository answerRepository) {
        this.userRepository = userRepository;
        this.submissionRepository = submissionRepository;
        this.answerRepository = answerRepository;
    }




    @Transactional(readOnly = true)
    public List<ParticipantWithScoresDTO> getAllParticipantsWithScores() {
        List<UserEntity> participants = userRepository.findAll().stream()
                .filter(user -> user.getRole() == UserRole.PARTICIPANT)
                .collect(Collectors.toList());

        return participants.stream()
                .map(this::convertToParticipantWithScoresDTO)
                .collect(Collectors.toList());
    }




    @Transactional(readOnly = true)
    public List<ParticipantWithScoresDTO> filterParticipants(ParticipantFilterRequestDTO filterRequest) {
        List<ParticipantWithScoresDTO> allParticipants = getAllParticipantsWithScores();

        return allParticipants.stream()
                .filter(participant -> matchesFilters(participant, filterRequest))
                .collect(Collectors.toList());
    }




    private ParticipantWithScoresDTO convertToParticipantWithScoresDTO(UserEntity user) {

        List<QuizSubmissionEntity> submissions = submissionRepository.findByParticipant(user);


        Map<Long, Double> quizScores = new HashMap<>();
        Map<Long, String> questionnaireAnswers = new HashMap<>();

        for (QuizSubmissionEntity submission : submissions) {
            QuizEntity quiz = submission.getQuiz();


            if (submission.getSubmittedAt() != null && submission.getScore() != null) {
                Long quizId = quiz.getId();
                quizScores.put(quizId, submission.getScore());
            }


            if (quiz.getType() == QuizType.BACKGROUND_SURVEY) {

                List<AnswerEntity> answers = answerRepository.findBySubmission(submission);
                for (AnswerEntity answer : answers) {
                    Long questionId = answer.getQuestion().getId();
                    String answerText = null;

                    if (answer.getSelectedOption() != null) {

                        answerText = answer.getSelectedOption().getOptionText();
                    } else if (answer.getAnswerText() != null) {

                        answerText = answer.getAnswerText();
                    }

                    if (answerText != null) {

                        if (questionnaireAnswers.containsKey(questionId)) {
                            questionnaireAnswers.put(questionId,
                                questionnaireAnswers.get(questionId) + "; " + answerText);
                        } else {
                            questionnaireAnswers.put(questionId, answerText);
                        }
                    }
                }
            }
        }

        return new ParticipantWithScoresDTO(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getSkills(),
                user.getYearsOfExperience(),
                quizScores,
                questionnaireAnswers
        );
    }




    private boolean matchesFilters(ParticipantWithScoresDTO participant, ParticipantFilterRequestDTO filters) {

        if (filters.minQuizScores() != null && !filters.minQuizScores().isEmpty()) {
            for (Map.Entry<Long, Double> entry : filters.minQuizScores().entrySet()) {
                Long quizId = entry.getKey();
                Double minScore = entry.getValue();
                Double participantScore = participant.quizScores().get(quizId);

                if (participantScore == null || participantScore < minScore) {
                    return false;
                }
            }
        }


        if (filters.questionnaireAnswers() != null && !filters.questionnaireAnswers().isEmpty()) {
            for (Map.Entry<Long, String> entry : filters.questionnaireAnswers().entrySet()) {
                Long questionId = entry.getKey();
                String expectedAnswer = entry.getValue().toLowerCase().trim();
                String participantAnswer = participant.questionnaireAnswers().get(questionId);

                if (participantAnswer == null) {
                    return false;
                }


                if (!participantAnswer.toLowerCase().contains(expectedAnswer)) {
                    return false;
                }
            }
        }


        if (filters.experienceLevel() != null && !filters.experienceLevel().trim().isEmpty()) {
            String level = filters.experienceLevel().toLowerCase().trim();
            String skills = participant.skills() != null ? participant.skills().toLowerCase() : "";
            String name = participant.name().toLowerCase();

            if (!skills.contains(level) && !name.contains(level)) {
                return false;
            }
        }

        if (filters.minYearsOfExperience() != null) {
            Integer participantYears = participant.yearsOfExperience();
            if (participantYears == null || participantYears < filters.minYearsOfExperience()) {
                return false;
            }
        }

        if (filters.skills() != null && !filters.skills().trim().isEmpty()) {
            String participantSkillsRaw = participant.skills() != null ? participant.skills() : "";

            Set<String> participantSkillSet = Arrays.stream(participantSkillsRaw.split(","))
                    .map(s -> s.trim().toLowerCase())
                    .filter(s -> !s.isEmpty())
                    .collect(Collectors.toSet());

            String[] filterSkillArray = filters.skills().split(",");
            boolean hasAnySkill = false;
            for (String filterSkill : filterSkillArray) {
                String trimmedFilterSkill = filterSkill.trim().toLowerCase();
                if (!trimmedFilterSkill.isEmpty() && participantSkillSet.contains(trimmedFilterSkill)) {
                    hasAnySkill = true;
                    break;
                }
            }

            if (!hasAnySkill) {
                return false;
            }
        }

        return true;
    }
}

