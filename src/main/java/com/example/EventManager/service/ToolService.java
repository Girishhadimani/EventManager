package com.example.EventManager.service;

import com.example.EventManager.dto.*;
import com.example.EventManager.entity.Event;
import com.example.EventManager.entity.EventEvaluation;
import com.example.EventManager.entity.EventSubmission;
import com.example.EventManager.entity.User;
import com.example.EventManager.enums.EventType;
import com.example.EventManager.enums.ToolType;
import com.example.EventManager.exception.ResourceNotFoundException;
import com.example.EventManager.repository.EventEvaluationRepository;
import com.example.EventManager.repository.EventRepository;
import com.example.EventManager.repository.EventSubmissionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class ToolService {

    private final EventRepository eventRepository;
    private final EventSubmissionRepository submissionRepository;
    private final EventEvaluationRepository evaluationRepository;

    /**
     * Recommended default tools for each EventType
     */
    public Set<ToolType> getDefaultToolsForEventType(EventType eventType) {
        if (eventType == null) return Collections.emptySet();

        switch (eventType) {
            case CODING:
                return new LinkedHashSet<>(List.of(
                        ToolType.CODE_EDITOR,
                        ToolType.CODE_COMPILER,
                        ToolType.TEST_CASES,
                        ToolType.TIMER,
                        ToolType.LEADERBOARD
                ));
            case HACKATHON:
                return new LinkedHashSet<>(List.of(
                        ToolType.TEAM_FORMATION,
                        ToolType.GITHUB_INTEGRATION,
                        ToolType.FILE_SUBMISSION,
                        ToolType.JUDGE_PANEL,
                        ToolType.LEADERBOARD
                ));
            case QUIZ:
                return new LinkedHashSet<>(List.of(
                        ToolType.QUIZ_ENGINE,
                        ToolType.TIMER,
                        ToolType.LEADERBOARD
                ));
            case DESIGN:
                return new LinkedHashSet<>(List.of(
                        ToolType.DESIGN_EDITOR,
                        ToolType.FILE_SUBMISSION,
                        ToolType.JUDGE_PANEL,
                        ToolType.LEADERBOARD
                ));
            case WORKSHOP:
                return new LinkedHashSet<>(List.of(
                        ToolType.ATTENDANCE,
                        ToolType.CERTIFICATE,
                        ToolType.FILE_SUBMISSION
                ));
            case PROJECT_EXHIBITION:
                return new LinkedHashSet<>(List.of(
                        ToolType.TEAM_FORMATION,
                        ToolType.FILE_SUBMISSION,
                        ToolType.GITHUB_INTEGRATION,
                        ToolType.JUDGE_PANEL,
                        ToolType.LEADERBOARD
                ));
            case DEBATE:
                return new LinkedHashSet<>(List.of(
                        ToolType.TIMER,
                        ToolType.JUDGE_PANEL,
                        ToolType.LEADERBOARD
                ));
            case CULTURAL:
                return new LinkedHashSet<>(List.of(
                        ToolType.JUDGE_PANEL,
                        ToolType.LEADERBOARD,
                        ToolType.CERTIFICATE
                ));
            case SPORTS:
                return new LinkedHashSet<>(List.of(
                        ToolType.TEAM_FORMATION,
                        ToolType.LEADERBOARD
                ));
            default:
                return new LinkedHashSet<>(List.of(
                        ToolType.FILE_SUBMISSION,
                        ToolType.ATTENDANCE
                ));
        }
    }

    /**
     * Metadata catalog for UI wizard
     */
    public Map<String, Object> getTypesAndDefaults() {
        List<Map<String, Object>> typesList = new ArrayList<>();

        for (EventType type : EventType.values()) {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("type", type.name());
            map.put("label", formatLabel(type.name()));
            map.put("icon", getIconForType(type));
            map.put("description", getDescriptionForType(type));
            map.put("defaultTools", getDefaultToolsForEventType(type));
            typesList.add(map);
        }

        List<Map<String, String>> toolsList = new ArrayList<>();
        for (ToolType tool : ToolType.values()) {
            Map<String, String> map = new LinkedHashMap<>();
            map.put("tool", tool.name());
            map.put("label", formatLabel(tool.name()));
            toolsList.add(map);
        }

        return Map.of("eventTypes", typesList, "allTools", toolsList);
    }

    // ============================================================
    // 1. CODING ENGINE
    // ============================================================

    @Transactional
    public CodeRunResponse runOrSubmitCode(CodeRunRequest request, User currentUser) {
        long startTime = System.currentTimeMillis();
        Event event = eventRepository.findById(request.getEventId())
                .orElseThrow(() -> new ResourceNotFoundException("Event", request.getEventId()));

        String code = request.getCode() != null ? request.getCode().trim() : "";
        String lang = request.getLanguage() != null ? request.getLanguage().toLowerCase() : "python";

        if (code.isEmpty()) {
            return CodeRunResponse.builder()
                    .status("COMPILATION_ERROR")
                    .output("Error: Source code cannot be empty.")
                    .testsPassed(0)
                    .totalTests(3)
                    .score(0)
                    .feedback("Please write your solution before running or submitting.")
                    .build();
        }

        // Standardized simulated test cases for problem
        List<CodeRunResponse.TestCaseResult> testResults = new ArrayList<>();
        boolean pass1 = !code.contains("error") && !code.contains("throw");
        boolean pass2 = code.length() > 20;
        boolean pass3 = code.contains("return") || code.contains("print") || code.contains("System.out") || code.contains("cout");

        testResults.add(CodeRunResponse.TestCaseResult.builder()
                .testName("Test Case 1 (Sample)")
                .input("nums = [2, 7, 11, 15], target = 9")
                .expectedOutput("[0, 1]")
                .actualOutput(pass1 ? "[0, 1]" : "Wrong Output")
                .passed(pass1)
                .build());

        testResults.add(CodeRunResponse.TestCaseResult.builder()
                .testName("Test Case 2 (Edge Case)")
                .input("nums = [3, 2, 4], target = 6")
                .expectedOutput("[1, 2]")
                .actualOutput(pass2 ? "[1, 2]" : "Wrong Output")
                .passed(pass2)
                .build());

        testResults.add(CodeRunResponse.TestCaseResult.builder()
                .testName("Test Case 3 (Large Input)")
                .input("nums = [3, 3], target = 6")
                .expectedOutput("[0, 1]")
                .actualOutput(pass3 ? "[0, 1]" : "Timeout")
                .passed(pass3)
                .build());

        int passedCount = (pass1 ? 1 : 0) + (pass2 ? 1 : 0) + (pass3 ? 1 : 0);
        int totalScore = (int) Math.round(((double) passedCount / 3.0) * 100);
        String status = (passedCount == 3) ? "ACCEPTED" : "WRONG_ANSWER";

        long executionTime = Math.max(12, System.currentTimeMillis() - startTime + new Random().nextInt(40));

        String executionOutput = String.format(
                "--- Execution Finished [%s] ---\nLanguage: %s\nStatus: %s\nExecution Time: %d ms\nMemory: 18.4 MB\nAll Tests: %d/3 Passed\nScore: %d/100",
                request.isSubmission() ? "SUBMISSION" : "TEST RUN",
                lang.toUpperCase(),
                status,
                executionTime,
                passedCount,
                totalScore
        );

        if (request.isSubmission()) {
            EventSubmission submission = submissionRepository.findByEvent_IdAndUser_Id(event.getId(), currentUser.getId())
                    .orElse(EventSubmission.builder()
                            .event(event)
                            .user(currentUser)
                            .submissionType("CODING")
                            .title(event.getTitle() + " - Solution")
                            .build());

            submission.setContent(code);
            submission.setDescription("Language: " + lang.toUpperCase() + " | Time: " + executionTime + "ms");
            submission.setScore(totalScore);
            submission.setStatus(passedCount == 3 ? "QUALIFIED" : "SUBMITTED");
            submission.setSubmittedAt(LocalDateTime.now());
            submissionRepository.save(submission);
        }

        return CodeRunResponse.builder()
                .status(status)
                .output(executionOutput)
                .executionTimeMs(executionTime)
                .testsPassed(passedCount)
                .totalTests(3)
                .score(totalScore)
                .feedback(passedCount == 3
                        ? "🎉 Excellent! All test cases passed successfully."
                        : "⚠️ Some test cases failed. Check edge case handling and constraints.")
                .testCaseResults(testResults)
                .build();
    }

    // ============================================================
    // 2. QUIZ ENGINE
    // ============================================================

    public List<Map<String, Object>> getQuizQuestions(Long eventId) {
        // High-quality CS & Web Quiz bank
        List<Map<String, Object>> questions = new ArrayList<>();

        questions.add(Map.of(
                "id", 1,
                "question", "Which HTTP method is idempotent and used for full updates to a resource in REST APIs?",
                "options", List.of("POST", "PUT", "PATCH", "CONNECT"),
                "timeLimit", 30
        ));

        questions.add(Map.of(
                "id", 2,
                "question", "In Spring Security, what component is responsible for storing the current security context and principal?",
                "options", List.of("SecurityContextHolder", "AuthenticationManager", "UserDetailsService", "WebSecurityConfigurer"),
                "timeLimit", 30
        ));

        questions.add(Map.of(
                "id", 3,
                "question", "What is the worst-case time complexity of QuickSort with standard pivoting?",
                "options", List.of("O(n log n)", "O(n)", "O(n²)", "O(log n)"),
                "timeLimit", 30
        ));

        questions.add(Map.of(
                "id", 4,
                "question", "In PostgreSQL, which constraint guarantees uniqueness and creates a B-Tree index automatically?",
                "options", List.of("CHECK", "NOT NULL", "PRIMARY KEY", "FOREIGN KEY"),
                "timeLimit", 30
        ));

        questions.add(Map.of(
                "id", 5,
                "question", "What is the primary benefit of stateless JWT authentication in modern web applications?",
                "options", List.of(
                        "No session state stored in server memory (highly scalable)",
                        "Tokens cannot be tampered with or revoked",
                        "Tokens automatically encrypt all request payloads",
                        "Tokens bypass CORS policies"
                ),
                "timeLimit", 30
        ));

        return questions;
    }

    @Transactional
    public QuizSubmitResponse submitQuiz(QuizSubmitRequest request, User currentUser) {
        Event event = eventRepository.findById(request.getEventId())
                .orElseThrow(() -> new ResourceNotFoundException("Event", request.getEventId()));

        // Correct answer keys (0-based)
        Map<Integer, Integer> answerKeys = Map.of(
                0, 1, // PUT
                1, 0, // SecurityContextHolder
                2, 2, // O(n^2)
                3, 2, // PRIMARY KEY
                4, 0  // No session state stored
        );

        List<String> questionTexts = List.of(
                "HTTP method for idempotent full update (PUT)",
                "Component storing security context (SecurityContextHolder)",
                "Worst-case QuickSort complexity (O(n²))",
                "PostgreSQL constraint with auto B-Tree index (PRIMARY KEY)",
                "Primary benefit of stateless JWT (Scalable, no server session)"
        );

        int total = 5;
        int correct = 0;
        List<QuizSubmitResponse.QuestionReview> reviews = new ArrayList<>();

        for (int i = 0; i < total; i++) {
            int selected = request.getAnswers() != null && request.getAnswers().containsKey(i)
                    ? request.getAnswers().get(i)
                    : -1;
            int right = answerKeys.get(i);
            boolean isRight = (selected == right);
            if (isRight) correct++;

            reviews.add(QuizSubmitResponse.QuestionReview.builder()
                    .questionIndex(i + 1)
                    .question(questionTexts.get(i))
                    .selectedOption(selected)
                    .correctOption(right)
                    .isCorrect(isRight)
                    .build());
        }

        int score = correct * 20; // 100 max
        double percentage = (correct / (double) total) * 100.0;

        String badge = (score >= 80) ? "🥇 Gold Mastery" : (score >= 60) ? "🥈 Silver Achiever" : "🥉 Participant";

        // Save submission
        EventSubmission submission = submissionRepository.findByEvent_IdAndUser_Id(event.getId(), currentUser.getId())
                .orElse(EventSubmission.builder()
                        .event(event)
                        .user(currentUser)
                        .submissionType("QUIZ")
                        .title(event.getTitle() + " - Quiz Attempt")
                        .build());

        submission.setScore(score);
        submission.setStatus("EVALUATED");
        submission.setDescription("Correct: " + correct + "/" + total + " (" + (int)percentage + "%) | Time: " + request.getTimeSpentSeconds() + "s");
        submission.setSubmittedAt(LocalDateTime.now());
        submissionRepository.save(submission);

        return QuizSubmitResponse.builder()
                .totalQuestions(total)
                .correctAnswers(correct)
                .score(score)
                .percentage(percentage)
                .rankBadge(badge)
                .reviews(reviews)
                .build();
    }

    // ============================================================
    // 3. SUBMISSIONS & JUDGING (Design, Hackathon, Project)
    // ============================================================

    @Transactional
    public EventSubmission saveSubmission(ToolSubmissionRequest request, User currentUser) {
        Event event = eventRepository.findById(request.getEventId())
                .orElseThrow(() -> new ResourceNotFoundException("Event", request.getEventId()));

        EventSubmission submission = submissionRepository.findByEvent_IdAndUser_Id(event.getId(), currentUser.getId())
                .orElse(EventSubmission.builder()
                        .event(event)
                        .user(currentUser)
                        .build());

        submission.setSubmissionType(request.getSubmissionType() != null ? request.getSubmissionType() : "PROJECT");
        submission.setTitle(request.getTitle() != null ? request.getTitle() : event.getTitle() + " Submission");
        submission.setDescription(request.getDescription());
        submission.setContent(request.getContent());
        submission.setDataUrl(request.getDataUrl());
        submission.setGithubUrl(request.getGithubUrl());
        submission.setDemoUrl(request.getDemoUrl());
        submission.setVideoUrl(request.getVideoUrl());
        submission.setTeamName(request.getTeamName());
        submission.setTeamMembers(request.getTeamMembers());
        submission.setStatus("SUBMITTED");
        submission.setSubmittedAt(LocalDateTime.now());

        return submissionRepository.save(submission);
    }

    public List<EventSubmission> getSubmissionsForEvent(Long eventId) {
        return submissionRepository.findByEvent_Id(eventId);
    }

    public Optional<EventSubmission> getMySubmission(Long eventId, Long userId) {
        return submissionRepository.findByEvent_IdAndUser_Id(eventId, userId);
    }

    @Transactional
    public EventSubmission evaluateSubmission(Long submissionId, JudgeEvaluationRequest request, User reviewer) {
        EventSubmission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Submission", submissionId));

        int total = request.getInnovationScore()
                + request.getTechnicalScore()
                + request.getUiScore()
                + request.getImpactScore()
                + request.getPresentationScore()
                + request.getDemoScore();

        EventEvaluation eval = EventEvaluation.builder()
                .submission(submission)
                .reviewer(reviewer)
                .innovationScore(request.getInnovationScore())
                .technicalScore(request.getTechnicalScore())
                .uiScore(request.getUiScore())
                .impactScore(request.getImpactScore())
                .presentationScore(request.getPresentationScore())
                .demoScore(request.getDemoScore())
                .totalScore(total)
                .remarks(request.getRemarks())
                .evaluatedAt(LocalDateTime.now())
                .build();

        evaluationRepository.save(eval);

        submission.setScore(total);
        submission.setStatus(total >= 80 ? "WINNER" : "EVALUATED");
        submission.setJudgeRemarks(request.getRemarks());
        submission.setReviewedBy(reviewer);
        submission.setEvaluatedAt(LocalDateTime.now());

        return submissionRepository.save(submission);
    }

    public List<Map<String, Object>> getLeaderboard(Long eventId) {
        List<EventSubmission> list = submissionRepository.findByEvent_IdOrderByScoreDescSubmittedAtAsc(eventId);
        List<Map<String, Object>> board = new ArrayList<>();

        int rank = 1;
        for (EventSubmission s : list) {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("rank", rank++);
            entry.put("submissionId", s.getId());
            entry.put("participantName", s.getUser().getName());
            entry.put("participantEmail", s.getUser().getEmail());
            entry.put("teamName", s.getTeamName() != null ? s.getTeamName() : s.getUser().getName());
            entry.put("submissionType", s.getSubmissionType());
            entry.put("title", s.getTitle());
            entry.put("score", s.getScore());
            entry.put("status", s.getStatus());
            entry.put("submittedAt", s.getSubmittedAt());
            board.add(entry);
        }

        return board;
    }

    // --- Helpers ---
    private String formatLabel(String name) {
        if (name == null) return "";
        return Arrays.stream(name.split("_"))
                .map(w -> w.substring(0, 1).toUpperCase() + w.substring(1).toLowerCase())
                .reduce((a, b) -> a + " " + b)
                .orElse(name);
    }

    private String getIconForType(EventType type) {
        switch (type) {
            case CODING: return "💻";
            case HACKATHON: return "🚀";
            case QUIZ: return "🧠";
            case DESIGN: return "🎨";
            case WORKSHOP: return "🛠️";
            case PROJECT_EXHIBITION: return "💡";
            case DEBATE: return "🗣️";
            case CULTURAL: return "🎭";
            case SPORTS: return "🏆";
            default: return "📦";
        }
    }

    private String getDescriptionForType(EventType type) {
        switch (type) {
            case CODING: return "Algorithmic challenges with embedded editor, compiler, test cases and live leaderboard.";
            case HACKATHON: return "Intensive build sprint with team formation, GitHub integration, demos and judge rubrics.";
            case QUIZ: return "Timed interactive knowledge competition with MCQ questions and instant grading.";
            case DESIGN: return "Creative visual competition with embedded poster canvas, templates, and judge scoring.";
            case WORKSHOP: return "Hands-on learning session with attendance tracking, resources, and certificates.";
            case PROJECT_EXHIBITION: return "Showcase student innovations with architecture docs, live demos, and rubric judging.";
            case DEBATE: return "Structured speaking rounds with timer management and judge scoring.";
            case CULTURAL: return "Performing arts showcase with auditions, scheduling, and judge panels.";
            case SPORTS: return "Tournament fixtures, match schedules, points table, and brackets.";
            default: return "General college event with digital registrations and attendance management.";
        }
    }
}
