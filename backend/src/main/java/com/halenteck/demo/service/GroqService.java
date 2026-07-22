package com.halenteck.demo.service;

import com.halenteck.demo.QuestionType;
import com.halenteck.demo.dto.CreateOptionDTO;
import com.halenteck.demo.dto.CreateQuestionDTO;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Service
public class GroqService {

    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    private final String apiKey;

    @Value("${groq.api.model:llama-3.1-8b-instant}")
    private String model;

    public GroqService(@Value("${groq.api.key}") String apiKey) {
        this.apiKey = apiKey;
        this.webClient = WebClient.builder()
                .baseUrl("https://api.groq.com/openai/v1")
                .build();
        this.objectMapper = new ObjectMapper();
    }


    private boolean lastGenerationWasFallback = false;

    public boolean wasLastGenerationFallback() {
        return lastGenerationWasFallback;
    }







    public List<CreateQuestionDTO> generateQuestions(String topic, int count) {
        lastGenerationWasFallback = false;

        int safeCount = Math.min(count, 5);

        String prompt = buildPrompt(topic, safeCount);


        int maxRetries = 2;
        for (int attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                if (attempt > 0) {
                    System.out.println("Retrying GroqCloud API call, attempt " + (attempt + 1));
                    Thread.sleep(2000 * attempt);
                }
                String response = callGroqApi(prompt);
                List<CreateQuestionDTO> questions = parseGroqResponse(response, topic, safeCount);
                if (!questions.isEmpty()) {
                    return questions;
                }
            } catch (Exception e) {
                String errorMsg = e.getMessage();
                System.err.println("GroqCloud API error (attempt " + (attempt + 1) + "): " + errorMsg);


                if (errorMsg != null && errorMsg.contains("429") && attempt < maxRetries) {
                    continue;
                }
            }
        }


        System.out.println("Using fallback questions (API unavailable or rate limited)");
        lastGenerationWasFallback = true;
        return generateFallbackQuestions(topic, safeCount);
    }

    private String buildPrompt(String topic, int count) {
        return String.format("""
            Generate %d quiz questions about "%s". Return JSON array only:
            [{"question":"Q?","options":[{"text":"A","correct":true},{"text":"B","correct":false},{"text":"C","correct":false},{"text":"D","correct":false}]}]
            Rules: 4 options each, 1 correct per question, technical focus.
            """, count, topic);
    }

    private String callGroqApi(String prompt) {
        String url = "/chat/completions";


        String requestBody = String.format("""
            {
              "model": "%s",
              "messages": [
                {
                  "role": "user",
                  "content": "%s"
                }
              ],
              "temperature": 0.8,
              "max_tokens": 1024
            }
            """, model, escapeJson(prompt));

        System.out.println("Calling GroqCloud API: " + url);

        return webClient.post()
                .uri(url)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(String.class)
                .block();
    }

    private List<CreateQuestionDTO> parseGroqResponse(String response, String topic, int expectedCount) {
        List<CreateQuestionDTO> questions = new ArrayList<>();

        try {
            JsonNode root = objectMapper.readTree(response);


            JsonNode choices = root.path("choices");
            if (choices.isArray() && choices.size() > 0) {
                JsonNode firstChoice = choices.get(0);
                JsonNode message = firstChoice.path("message");
                String text = message.path("content").asText();


                text = text.trim();
                if (text.startsWith("```json")) {
                    text = text.substring(7);
                } else if (text.startsWith("```")) {
                    text = text.substring(3);
                }
                if (text.endsWith("```")) {
                    text = text.substring(0, text.length() - 3);
                }
                text = text.trim();


                JsonNode questionsArray = objectMapper.readTree(text);

                if (questionsArray.isArray()) {
                    for (JsonNode qNode : questionsArray) {
                        String questionText = qNode.path("question").asText();
                        JsonNode optionsNode = qNode.path("options");

                        if (questionText != null && !questionText.isEmpty() && optionsNode.isArray()) {
                            List<CreateOptionDTO> options = new ArrayList<>();

                            for (JsonNode optNode : optionsNode) {
                                String optText = optNode.path("text").asText();
                                boolean isCorrect = optNode.path("correct").asBoolean(false);
                                options.add(new CreateOptionDTO(optText, isCorrect));
                            }


                            boolean hasCorrect = options.stream().anyMatch(CreateOptionDTO::isCorrect);
                            if (!hasCorrect && !options.isEmpty()) {
                                options.set(0, new CreateOptionDTO(options.get(0).optionText(), true));
                            }


                            Collections.shuffle(options);

                            questions.add(new CreateQuestionDTO(
                                    questionText,
                                    QuestionType.MULTIPLE_CHOICE,
                                    options
                            ));
                        }
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("Error parsing GroqCloud response: " + e.getMessage());
        }


        if (questions.isEmpty()) {
            return generateFallbackQuestions(topic, expectedCount);
        }

        return questions;
    }

    private List<CreateQuestionDTO> generateFallbackQuestions(String topic, int count) {
        List<CreateQuestionDTO> questions = new ArrayList<>();
        String t = topic.toLowerCase();


        List<String[]> questionBank = new ArrayList<>();


        if (t.contains("python") || t.contains("list") || t.contains("dict")) {
            questionBank.add(new String[]{"What is the correct way to create a list in Python?", "my_list = [1, 2, 3]", "my_list = (1, 2, 3)", "my_list = {1, 2, 3}", "my_list = <1, 2, 3>"});
            questionBank.add(new String[]{"How do you add an element to the end of a Python list?", "list.append(element)", "list.add(element)", "list.push(element)", "list.insert(element)"});
            questionBank.add(new String[]{"What does len() function return for a list?", "The number of elements in the list", "The last element", "The first element", "The sum of elements"});
            questionBank.add(new String[]{"How do you access the first element of a list in Python?", "list[0]", "list[1]", "list.first()", "list.get(1)"});
            questionBank.add(new String[]{"What is list slicing in Python?", "Extracting a portion of a list using [start:end]", "Deleting a list", "Sorting a list", "Copying a list to memory"});
        }

        else if (t.contains("javascript") || t.contains("js") || t.contains("react") || t.contains("node")) {
            questionBank.add(new String[]{"What is the correct way to declare a variable in modern JavaScript?", "const x = 5; or let x = 5;", "var x == 5;", "variable x = 5;", "int x = 5;"});
            questionBank.add(new String[]{"What does === operator do in JavaScript?", "Checks value and type equality", "Assigns a value", "Checks only value equality", "Declares a constant"});
            questionBank.add(new String[]{"How do you create an arrow function in JavaScript?", "const fn = () => {}", "function fn = () => {}", "def fn(): pass", "fn := lambda: none"});
            questionBank.add(new String[]{"What is the purpose of async/await in JavaScript?", "Handle asynchronous operations more cleanly", "Make code run faster", "Create multiple threads", "Compile JavaScript to bytecode"});
            questionBank.add(new String[]{"What does Array.map() do in JavaScript?", "Creates a new array with transformed elements", "Finds an element in array", "Sorts the array", "Removes duplicates"});
        }

        else if (t.contains("java") && !t.contains("javascript")) {
            questionBank.add(new String[]{"What is the entry point of a Java application?", "public static void main(String[] args)", "def main():", "function main()", "void start()"});
            questionBank.add(new String[]{"What is inheritance in Java?", "A mechanism where a class acquires properties of another class", "A way to delete objects", "A method to print output", "A loop structure"});
            questionBank.add(new String[]{"What keyword is used to create an object in Java?", "new", "create", "object", "instance"});
            questionBank.add(new String[]{"What is an interface in Java?", "A contract that classes can implement", "A type of variable", "A debugging tool", "A compiler directive"});
            questionBank.add(new String[]{"What does 'final' keyword mean in Java?", "The value cannot be changed after initialization", "The code runs faster", "The class is abstract", "The method is private"});
        }

        else if (t.contains("sql") || t.contains("database") || t.contains("query")) {
            questionBank.add(new String[]{"What SQL command is used to retrieve data?", "SELECT", "GET", "FETCH", "RETRIEVE"});
            questionBank.add(new String[]{"What does WHERE clause do in SQL?", "Filters rows based on a condition", "Sorts the results", "Groups the results", "Joins two tables"});
            questionBank.add(new String[]{"How do you sort results in descending order?", "ORDER BY column DESC", "SORT BY column DOWN", "ARRANGE column REVERSE", "ORDER column DESCENDING"});
            questionBank.add(new String[]{"What is a PRIMARY KEY?", "A unique identifier for each row in a table", "The first column in a table", "A password for the database", "A foreign reference"});
            questionBank.add(new String[]{"What does JOIN do in SQL?", "Combines rows from two or more tables", "Creates a new table", "Deletes duplicate rows", "Exports data to file"});
        }

        else {
            questionBank.add(new String[]{"What is a variable in programming?", "A named storage location for data", "A type of loop", "A function parameter only", "A compiler error"});
            questionBank.add(new String[]{"What is the purpose of a function?", "To organize reusable blocks of code", "To store data permanently", "To create errors", "To slow down execution"});
            questionBank.add(new String[]{"What is a loop used for?", "Repeating a block of code multiple times", "Storing multiple values", "Connecting to databases", "Defining classes"});
            questionBank.add(new String[]{"What is debugging?", "Finding and fixing errors in code", "Writing new features", "Deleting all code", "Compiling the program"});
            questionBank.add(new String[]{"What is an array?", "A collection of elements stored in contiguous memory", "A single variable", "A type of function", "A debugging tool"});
        }


        for (int i = 0; i < count && i < questionBank.size(); i++) {
            String[] q = questionBank.get(i);
            List<CreateOptionDTO> options = new ArrayList<>(List.of(
                    new CreateOptionDTO(q[1], true),
                    new CreateOptionDTO(q[2], false),
                    new CreateOptionDTO(q[3], false),
                    new CreateOptionDTO(q[4], false)
            ));


            Collections.shuffle(options);

            questions.add(new CreateQuestionDTO(
                    q[0],
                    QuestionType.MULTIPLE_CHOICE,
                    options
            ));
        }

        return questions;
    }

    private String escapeJson(String text) {
        return text
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }
}

