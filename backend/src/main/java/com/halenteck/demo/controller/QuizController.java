
package com.halenteck.demo.controller;

import com.halenteck.demo.dto.CreateQuizRequest;
import com.halenteck.demo.dto.UpdateQuizRequest;
import com.halenteck.demo.dto.QuizSummaryDTO;
import com.halenteck.demo.entity.QuizEntity;
import com.halenteck.demo.service.QuizService;
import com.halenteck.demo.service.GroqService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.halenteck.demo.dto.GenerateQuizRequest;
import com.halenteck.demo.dto.CreateQuestionDTO;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/quizzes")
public class QuizController {

    private final QuizService quizService;
    private final GroqService groqService;

    public QuizController(QuizService quizService, GroqService groqService) {
        this.quizService = quizService;
        this.groqService = groqService;
    }







    @PostMapping
    public ResponseEntity<QuizEntity> createQuiz(@RequestBody CreateQuizRequest request, Principal principal) {

        QuizEntity newQuiz = quizService.createQuiz(request, principal);


        return ResponseEntity.status(HttpStatus.CREATED).body(newQuiz);
    }






    @GetMapping("/my-quizzes")
    public ResponseEntity<List<QuizSummaryDTO>> getMyQuizzes(Principal principal) {

        List<QuizSummaryDTO> quizzes = quizService.findQuizzesByCreator(principal);


        return ResponseEntity.ok(quizzes);
    }




    @GetMapping("/{quizId}/details")
    public ResponseEntity<?> getQuizDetails(@PathVariable Long quizId, Principal principal) {
        try {
            var quizDetails = quizService.getQuizDetailsForResearcher(quizId, principal);
            return ResponseEntity.ok(quizDetails);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }




    @GetMapping("/{quizId}")
    public ResponseEntity<?> getQuizForEdit(@PathVariable Long quizId, Principal principal) {
        try {
            var quizDetails = quizService.getQuizForEdit(quizId, principal);
            return ResponseEntity.ok(quizDetails);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        }
    }




    @GetMapping("/{quizId}/can-edit")
    public ResponseEntity<?> canEditQuiz(@PathVariable Long quizId, Principal principal) {
        try {
            boolean canEdit = quizService.canEditQuiz(quizId, principal);
            return ResponseEntity.ok(Map.of("canEdit", canEdit));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        }
    }




    @PutMapping("/{quizId}")
    public ResponseEntity<?> updateQuiz(@PathVariable Long quizId,
                                         @RequestBody UpdateQuizRequest request,
                                         Principal principal) {
        try {
            QuizEntity updatedQuiz = quizService.updateQuiz(quizId, request, principal);
            return ResponseEntity.ok(updatedQuiz);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to update quiz: " + e.getMessage()));
        }
    }





    @PostMapping("/generate")
    public ResponseEntity<?> generateQuestions(@RequestBody GenerateQuizRequest request, Principal principal) {
        try {
            String topic = request.topic() != null ? request.topic() : "General Programming";
            int count = request.count() > 0 ? Math.min(request.count(), 5) : 3;

            List<CreateQuestionDTO> questions = groqService.generateQuestions(topic, count);


            return ResponseEntity.ok(questions);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to generate questions: " + e.getMessage()));
        }
    }
}