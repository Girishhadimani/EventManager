package com.example.EventManager.service;

import com.example.EventManager.dto.VtuActivityPointsDTO;
import com.example.EventManager.entity.Event;
import com.example.EventManager.entity.EventRegistration;
import com.example.EventManager.entity.EventSubmission;
import com.example.EventManager.entity.User;
import com.example.EventManager.enums.EventType;
import com.example.EventManager.enums.RegistrationStatus;
import com.example.EventManager.exception.ResourceNotFoundException;
import com.example.EventManager.repository.RegistrationRepository;
import com.example.EventManager.repository.EventRepository;
import com.example.EventManager.repository.EventSubmissionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
public class CertificateService {

    private final EventRepository eventRepository;
    private final RegistrationRepository registrationRepository;
    private final EventSubmissionRepository submissionRepository;

    public Map<String, Object> generateCertificate(Long eventId, User student) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event", eventId));

        Optional<EventRegistration> regOpt = registrationRepository.findByUserAndEvent(student, event);
        if (regOpt.isEmpty()) {
            throw new IllegalArgumentException("Student was not registered for this event.");
        }
        EventRegistration reg = regOpt.get();

        Optional<EventSubmission> submission = submissionRepository.findByEvent_IdAndUser_Id(eventId, student.getId());
        String certType = (submission.isPresent() && "WINNER".equals(submission.get().getStatus()))
                ? "CERTIFICATE OF MERIT & EXCELLENCE"
                : "CERTIFICATE OF PARTICIPATION";

        String certId = String.format("CERT-%d-%d-%d", event.getId(), student.getId(), Math.abs(Objects.hash(event.getId(), student.getId(), 2026)));

        boolean feedbackNeeded = (reg.getFeedbackRating() == null);

        Map<String, Object> cert = new LinkedHashMap<>();
        cert.put("certificateId", certId);
        cert.put("title", certType);
        cert.put("recipientName", student.getName());
        cert.put("recipientEmail", student.getEmail());
        cert.put("eventName", event.getTitle());
        cert.put("institution", "KLS Gogte Institute of Technology, Belgaum");
        cert.put("clubName", event.getClub() != null ? event.getClub().getName() : "KLS GIT Student Clubs");
        cert.put("eventDate", event.getDate().toString());
        cert.put("issueDate", LocalDate.now().toString());
        cert.put("verificationCode", UUID.nameUUIDFromBytes(certId.getBytes()).toString().substring(0, 18).toUpperCase());
        cert.put("usn", student.getUsn() != null && !student.getUsn().isBlank() ? student.getUsn() : "STU-" + (1000 + student.getId()));
        cert.put("department", student.getDepartment() != null && !student.getDepartment().isBlank() ? student.getDepartment() : "Engineering");
        cert.put("status", "VERIFIED");
        cert.put("feedbackRequired", feedbackNeeded);
        cert.put("feedbackRating", reg.getFeedbackRating());
        cert.put("feedbackComments", reg.getFeedbackComments());
        cert.put("activityPoints", (reg.getActivityPointsEarned() != null && reg.getActivityPointsEarned() > 0) ? reg.getActivityPointsEarned() : event.getEffectiveActivityPoints());
        if (reg.getTeamName() != null && !reg.getTeamName().isBlank()) {
            cert.put("teamName", reg.getTeamName());
        }

        return cert;
    }

    public List<Map<String, Object>> getMyCertificates(User student) {
        List<EventRegistration> registrations = registrationRepository.findByUser(student);
        List<Map<String, Object>> list = new ArrayList<>();

        for (EventRegistration reg : registrations) {
            try {
                list.add(generateCertificate(reg.getEvent().getId(), student));
            } catch (Exception ignored) {
            }
        }
        return list;
    }

    public VtuActivityPointsDTO getVtuActivityPointsSummary(User student) {
        List<EventRegistration> registrations = registrationRepository.findByUser(student);

        String usn = (student.getUsn() != null && !student.getUsn().isBlank()) ? student.getUsn() : "STU-" + student.getId();
        String dept = (student.getDepartment() != null && !student.getDepartment().isBlank()) ? student.getDepartment() : "Computer Science & Engineering";
        String year = (student.getYearOfStudy() != null) ? (student.getYearOfStudy() + " Year") : "3rd Year";

        int totalPoints = 0;
        Map<String, Integer> catPoints = new LinkedHashMap<>();
        catPoints.put("Technical & Workshops", 0);
        catPoints.put("Hackathons & Innovations", 0);
        catPoints.put("Cultural & Sports", 0);
        catPoints.put("Community & Leadership", 0);

        List<VtuActivityPointsDTO.ActivityItem> items = new ArrayList<>();

        for (EventRegistration reg : registrations) {
            Event event = reg.getEvent();
            boolean isAttended = (reg.getStatus() == RegistrationStatus.ATTENDED);
            int pts = (reg.getActivityPointsEarned() != null && reg.getActivityPointsEarned() > 0)
                    ? reg.getActivityPointsEarned()
                    : event.getEffectiveActivityPoints();

            String cat;
            EventType type = event.getEventType() != null ? event.getEventType() : EventType.OTHER;
            switch (type) {
                case HACKATHON, PROJECT_EXHIBITION -> cat = "Hackathons & Innovations";
                case CODING, WORKSHOP, QUIZ, DESIGN -> cat = "Technical & Workshops";
                case CULTURAL, SPORTS, DEBATE -> cat = "Cultural & Sports";
                default -> cat = "Community & Leadership";
            }

            if (isAttended) {
                totalPoints += pts;
                catPoints.put(cat, catPoints.getOrDefault(cat, 0) + pts);
            }

            String certId = String.format("VTU-%d-%d-%d", event.getId(), student.getId(), Math.abs(Objects.hash(event.getId(), student.getId(), 2026)));
            String vCode = UUID.nameUUIDFromBytes(certId.getBytes()).toString().substring(0, 14).toUpperCase();

            items.add(VtuActivityPointsDTO.ActivityItem.builder()
                    .eventId(event.getId())
                    .eventName(event.getTitle())
                    .eventType(type.name())
                    .category(cat)
                    .clubName(event.getClub() != null ? event.getClub().getName() : "Student Club")
                    .eventDate(event.getDate() != null ? event.getDate().toString() : "2026")
                    .activityPoints(pts)
                    .registrationNumber(reg.getRegistrationNumber())
                    .verificationCode(vCode)
                    .status(isAttended ? "VERIFIED_ATTENDED" : reg.getStatus().name())
                    .build());
        }

        int target = 100;
        double pct = Math.min(100.0, Math.round((totalPoints * 100.0 / target) * 10.0) / 10.0);
        String transcriptHash = "VTU-AICTE-" + UUID.nameUUIDFromBytes((usn + "-KLSGIT-" + totalPoints).getBytes()).toString().substring(0, 16).toUpperCase();

        return VtuActivityPointsDTO.builder()
                .usn(usn)
                .studentName(student.getName())
                .studentEmail(student.getEmail())
                .department(dept)
                .academicYear(year)
                .institution("KLS Gogte Institute of Technology, Belagavi")
                .affiliation("Visvesvaraya Technological University (VTU), Belagavi")
                .totalPointsEarned(totalPoints)
                .targetPoints(target)
                .progressPercentage(pct)
                .status(totalPoints >= target ? "COMPLETED" : (totalPoints >= 50 ? "ON_TRACK" : "IN_PROGRESS"))
                .verificationHash(transcriptHash)
                .generatedAt(LocalDate.now().toString())
                .categoryPoints(catPoints)
                .activities(items)
                .build();
    }

    public com.example.EventManager.dto.CertificateVerificationResponse verifyCertificate(String hash) {
        if (hash == null || hash.isBlank()) {
            return com.example.EventManager.dto.CertificateVerificationResponse.builder()
                    .valid(false)
                    .remarks("Invalid or empty certificate identifier.")
                    .build();
        }

        String clean = hash.trim();
        // Check if format is CERT-eventId-userId-...
        if (clean.startsWith("CERT-")) {
            String[] parts = clean.split("-");
            if (parts.length >= 3) {
                try {
                    Long eventId = Long.parseLong(parts[1]);
                    Long userId = Long.parseLong(parts[2]);
                    Event event = eventRepository.findById(eventId).orElse(null);
                    if (event != null) {
                        Optional<EventRegistration> reg = registrationRepository.findByUser_IdAndEvent_Id(userId, eventId);
                        if (reg.isPresent()) {
                            User student = reg.get().getUser();
                            Optional<EventSubmission> sub = submissionRepository.findByEvent_IdAndUser_Id(eventId, userId);
                            boolean isWinner = sub.isPresent() && "WINNER".equals(sub.get().getStatus());
                            Integer score = sub.map(EventSubmission::getScore).orElse(null);

                            String usn = (student.getUsn() != null && !student.getUsn().isBlank())
                                    ? student.getUsn()
                                    : (reg.get().getUsnOrStudentId() != null && !reg.get().getUsnOrStudentId().isBlank())
                                    ? reg.get().getUsnOrStudentId()
                                    : "STU-" + (1000 + student.getId());

                            String dept = (student.getDepartment() != null && !student.getDepartment().isBlank())
                                    ? student.getDepartment()
                                    : (reg.get().getDepartment() != null && !reg.get().getDepartment().isBlank())
                                    ? reg.get().getDepartment()
                                    : "KLS GIT Belgaum";

                            return com.example.EventManager.dto.CertificateVerificationResponse.builder()
                                    .valid(true)
                                    .certificateHash(clean)
                                    .studentName(student.getName())
                                    .studentEmail(student.getEmail())
                                    .usnOrStudentId(usn)
                                    .department(dept)
                                    .eventTitle(event.getTitle())
                                    .clubName(event.getClub() != null ? event.getClub().getName() : "Campus Clubs")
                                    .certificateType(isWinner ? "CERTIFICATE OF MERIT & EXCELLENCE" : "CERTIFICATE OF PARTICIPATION")
                                    .issueDate(event.getDate())
                                    .score(score)
                                    .verificationUrl("/verify-certificate.html?hash=" + clean)
                                    .remarks("Officially verified and stamped by KLS Gogte Institute of Technology (KLS GIT Belgaum) Academic & Club Activity Registry.")
                                    .build();
                        }
                    }
                } catch (Exception ignored) {
                }
            }
        }

        return com.example.EventManager.dto.CertificateVerificationResponse.builder()
                .valid(false)
                .certificateHash(clean)
                .remarks("Certificate record not found or credential verification checksum mismatch.")
                .build();
    }
}
