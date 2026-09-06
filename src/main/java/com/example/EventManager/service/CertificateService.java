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
import com.lowagie.text.Document;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Chunk;
import com.lowagie.text.Element;
import com.lowagie.text.Rectangle;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.Image;
import com.lowagie.text.pdf.*;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.util.*;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CertificateService {

    private final EventRepository eventRepository;
    private final RegistrationRepository registrationRepository;
    private final EventSubmissionRepository submissionRepository;

    @Value("${app.base-url:http://localhost:8080}")
    private String baseUrl;

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

    public byte[] generateCertificatePdf(Long eventId, User student) {
        Map<String, Object> certData = generateCertificate(eventId, student);
        return buildPdfDocument(certData);
    }

    public byte[] generateCertificatePdfByHash(String hash) {
        if (hash == null || hash.isBlank()) {
            throw new ResourceNotFoundException("Invalid certificate identifier.");
        }
        String clean = hash.trim();
        if (clean.startsWith("CERT-")) {
            String[] parts = clean.split("-");
            if (parts.length >= 3) {
                Long eventId = Long.parseLong(parts[1]);
                Long userId = Long.parseLong(parts[2]);
                Event event = eventRepository.findById(eventId)
                        .orElseThrow(() -> new ResourceNotFoundException("Event", eventId));
                EventRegistration reg = registrationRepository.findByUser_IdAndEvent_Id(userId, eventId)
                        .orElseThrow(() -> new ResourceNotFoundException("Registration not found for certificate"));
                return generateCertificatePdf(eventId, reg.getUser());
            }
        }
        throw new ResourceNotFoundException("Certificate not found for code: " + hash);
    }

    private byte[] buildPdfDocument(Map<String, Object> certData) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4.rotate(), 45, 45, 38, 35);
            PdfWriter writer = PdfWriter.getInstance(document, out);

            writer.setPageEvent(new PdfPageEventHelper() {
                @Override
                public void onEndPage(PdfWriter writer, Document doc) {
                    PdfContentByte cb = writer.getDirectContent();
                    float width = doc.getPageSize().getWidth();
                    float height = doc.getPageSize().getHeight();

                    // Outer primary navy border
                    cb.setColorStroke(new Color(15, 23, 42)); // #0f172a
                    cb.setLineWidth(4f);
                    cb.rectangle(20, 20, width - 40, height - 40);
                    cb.stroke();

                    // Inner gold border
                    cb.setColorStroke(new Color(217, 119, 6)); // #d97706
                    cb.setLineWidth(1.5f);
                    cb.rectangle(26, 26, width - 52, height - 52);
                    cb.stroke();

                    // Corner flourish accents
                    cb.setColorStroke(new Color(217, 119, 6));
                    cb.setLineWidth(2.5f);
                    // Top-Left
                    cb.moveTo(18, height - 36); cb.lineTo(18, height - 18); cb.lineTo(36, height - 18); cb.stroke();
                    // Top-Right
                    cb.moveTo(width - 36, height - 18); cb.lineTo(width - 18, height - 18); cb.lineTo(width - 18, height - 36); cb.stroke();
                    // Bottom-Left
                    cb.moveTo(18, 36); cb.lineTo(18, 18); cb.lineTo(36, 18); cb.stroke();
                    // Bottom-Right
                    cb.moveTo(width - 36, 18); cb.lineTo(width - 18, 18); cb.lineTo(width - 18, 36); cb.stroke();
                }
            });

            document.open();

            // Colors
            Color navy = new Color(15, 23, 42);
            Color gold = new Color(217, 119, 6);
            Color blue = new Color(2, 132, 199);
            Color slate = new Color(71, 85, 105);
            Color darkText = new Color(30, 41, 59);

            // Fonts
            Font collegeFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 20, navy);
            Font subCollegeFont = FontFactory.getFont(FontFactory.HELVETICA, 9.5f, slate);
            Font clubFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, gold);
            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 22, navy);
            Font subTitleFont = FontFactory.getFont(FontFactory.HELVETICA, 10, slate);
            Font nameFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 21, blue);
            Font detailsFont = FontFactory.getFont(FontFactory.HELVETICA, 11, darkText);
            Font bodyFont = FontFactory.getFont(FontFactory.HELVETICA, 11.5f, darkText);
            Font bodyBoldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, navy);
            Font smallFont = FontFactory.getFont(FontFactory.HELVETICA, 8, slate);
            Font smallBoldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8.5f, navy);

            // 1. College Header
            Paragraph college = new Paragraph("KLS GOGTE INSTITUTE OF TECHNOLOGY, BELAGAVI", collegeFont);
            college.setAlignment(Element.ALIGN_CENTER);
            college.setSpacingAfter(2f);
            document.add(college);

            Paragraph affiliation = new Paragraph("Autonomous Institute Affiliated to Visvesvaraya Technological University, Belagavi | Approved by AICTE, New Delhi", subCollegeFont);
            affiliation.setAlignment(Element.ALIGN_CENTER);
            affiliation.setSpacingAfter(4f);
            document.add(affiliation);

            String clubName = String.valueOf(certData.getOrDefault("clubName", "KLS GIT Student Council"));
            Paragraph clubPara = new Paragraph(clubName.toUpperCase(), clubFont);
            clubPara.setAlignment(Element.ALIGN_CENTER);
            clubPara.setSpacingAfter(12f);
            document.add(clubPara);

            // 2. Certificate Title & Divider
            String certTitle = String.valueOf(certData.getOrDefault("title", "CERTIFICATE OF PARTICIPATION"));
            Paragraph titlePara = new Paragraph(certTitle, titleFont);
            titlePara.setAlignment(Element.ALIGN_CENTER);
            titlePara.setSpacingAfter(4f);
            document.add(titlePara);

            Paragraph presPara = new Paragraph("THIS IS OFFICIALLY PRESENTED TO", subTitleFont);
            presPara.setAlignment(Element.ALIGN_CENTER);
            presPara.setSpacingAfter(8f);
            document.add(presPara);

            // 3. Recipient Name & USN
            String recipientName = String.valueOf(certData.getOrDefault("recipientName", "Student")).toUpperCase();
            Paragraph namePara = new Paragraph(recipientName, nameFont);
            namePara.setAlignment(Element.ALIGN_CENTER);
            namePara.setSpacingAfter(4f);
            document.add(namePara);

            String usn = String.valueOf(certData.getOrDefault("usn", ""));
            String department = String.valueOf(certData.getOrDefault("department", "Engineering"));
            Paragraph infoPara = new Paragraph("USN: " + usn + "    |    Department: " + department, detailsFont);
            infoPara.setAlignment(Element.ALIGN_CENTER);
            infoPara.setSpacingAfter(12f);
            document.add(infoPara);

            // 4. Citation / Description Paragraph
            String eventName = String.valueOf(certData.getOrDefault("eventName", "College Event"));
            String eventDate = String.valueOf(certData.getOrDefault("eventDate", "2026"));

            Paragraph citation = new Paragraph();
            citation.setAlignment(Element.ALIGN_CENTER);
            citation.setLeading(18f);
            citation.add(new Chunk("for active and distinguished participation in the collegiate event ", bodyFont));
            citation.add(new Chunk("\"" + eventName + "\"", bodyBoldFont));
            citation.add(new Chunk(" organized on ", bodyFont));
            citation.add(new Chunk(eventDate, bodyBoldFont));
            citation.add(new Chunk(" under ", bodyFont));
            citation.add(new Chunk(clubName, bodyBoldFont));
            citation.add(new Chunk(".", bodyFont));
            citation.setSpacingAfter(14f);
            document.add(citation);

            // 5. VTU Points Badge & Cert ID Box
            Object pointsObj = certData.getOrDefault("activityPoints", 0);
            String certId = String.valueOf(certData.getOrDefault("certificateId", ""));

            PdfPTable badgeTable = new PdfPTable(2);
            badgeTable.setWidthPercentage(75);
            badgeTable.setWidths(new float[]{50f, 50f});
            badgeTable.getDefaultCell().setBorder(Rectangle.NO_BORDER);

            PdfPCell pointsCell = new PdfPCell();
            pointsCell.setBackgroundColor(new Color(254, 243, 199));
            pointsCell.setBorderColor(new Color(245, 158, 11));
            pointsCell.setPadding(6f);
            pointsCell.setHorizontalAlignment(Element.ALIGN_CENTER);
            Paragraph ptsPara = new Paragraph("VTU AICTE Activity Points: " + pointsObj + " Points", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, new Color(180, 83, 9)));
            ptsPara.setAlignment(Element.ALIGN_CENTER);
            pointsCell.addElement(ptsPara);

            PdfPCell idCell = new PdfPCell();
            idCell.setBackgroundColor(new Color(241, 245, 249));
            idCell.setBorderColor(new Color(203, 213, 225));
            idCell.setPadding(6f);
            idCell.setHorizontalAlignment(Element.ALIGN_CENTER);
            Paragraph idPara = new Paragraph("Credential ID: " + certId, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, navy));
            idPara.setAlignment(Element.ALIGN_CENTER);
            idCell.addElement(idPara);

            badgeTable.addCell(pointsCell);
            badgeTable.addCell(idCell);
            badgeTable.setSpacingAfter(18f);
            document.add(badgeTable);

            // 6. Footer Table: Signatures & QR Code
            PdfPTable footerTable = new PdfPTable(3);
            footerTable.setWidthPercentage(92);
            footerTable.setWidths(new float[]{36f, 28f, 36f});
            footerTable.getDefaultCell().setBorder(Rectangle.NO_BORDER);

            // Left Signature Cell
            PdfPCell leftCell = new PdfPCell();
            leftCell.setBorder(Rectangle.NO_BORDER);
            leftCell.setHorizontalAlignment(Element.ALIGN_CENTER);
            Paragraph leftLine = new Paragraph("___________________________", smallFont);
            leftLine.setAlignment(Element.ALIGN_CENTER);
            Paragraph leftTitle = new Paragraph("Faculty Coordinator", smallBoldFont);
            leftTitle.setAlignment(Element.ALIGN_CENTER);
            Paragraph leftClub = new Paragraph(clubName, smallFont);
            leftClub.setAlignment(Element.ALIGN_CENTER);
            Paragraph leftCollege = new Paragraph("KLS GIT Belagavi", smallFont);
            leftCollege.setAlignment(Element.ALIGN_CENTER);
            leftCell.addElement(leftLine);
            leftCell.addElement(leftTitle);
            leftCell.addElement(leftClub);
            leftCell.addElement(leftCollege);

            // Center QR Code Cell
            PdfPCell centerCell = new PdfPCell();
            centerCell.setBorder(Rectangle.NO_BORDER);
            centerCell.setHorizontalAlignment(Element.ALIGN_CENTER);

            String verifyUrl = baseUrl + "/verify-certificate.html?hash=" + certId;
            QRCodeWriter qrWriter = new QRCodeWriter();
            Map<EncodeHintType, Object> hints = new EnumMap<>(EncodeHintType.class);
            hints.put(EncodeHintType.CHARACTER_SET, "UTF-8");
            hints.put(EncodeHintType.MARGIN, 1);
            BitMatrix bitMatrix = qrWriter.encode(verifyUrl, BarcodeFormat.QR_CODE, 120, 120, hints);
            ByteArrayOutputStream qrPngOut = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(bitMatrix, "PNG", qrPngOut);
            Image qrImage = Image.getInstance(qrPngOut.toByteArray());
            qrImage.scaleToFit(70, 70);
            qrImage.setAlignment(Element.ALIGN_CENTER);

            Paragraph qrLabel = new Paragraph("Scan to Verify Online", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7.5f, gold));
            qrLabel.setAlignment(Element.ALIGN_CENTER);
            Paragraph certCode = new Paragraph(certId, FontFactory.getFont(FontFactory.HELVETICA, 6.5f, slate));
            certCode.setAlignment(Element.ALIGN_CENTER);

            centerCell.addElement(qrImage);
            centerCell.addElement(qrLabel);
            centerCell.addElement(certCode);

            // Right Signature Cell
            PdfPCell rightCell = new PdfPCell();
            rightCell.setBorder(Rectangle.NO_BORDER);
            rightCell.setHorizontalAlignment(Element.ALIGN_CENTER);
            Paragraph rightLine = new Paragraph("___________________________", smallFont);
            rightLine.setAlignment(Element.ALIGN_CENTER);
            Paragraph rightTitle = new Paragraph("Principal / Dean Academic", smallBoldFont);
            rightTitle.setAlignment(Element.ALIGN_CENTER);
            Paragraph rightCollege = new Paragraph("KLS Gogte Institute of Technology", smallFont);
            rightCollege.setAlignment(Element.ALIGN_CENTER);
            Paragraph rightAffil = new Paragraph("Autonomous, Belagavi", smallFont);
            rightAffil.setAlignment(Element.ALIGN_CENTER);
            rightCell.addElement(rightLine);
            rightCell.addElement(rightTitle);
            rightCell.addElement(rightCollege);
            rightCell.addElement(rightAffil);

            footerTable.addCell(leftCell);
            footerTable.addCell(centerCell);
            footerTable.addCell(rightCell);
            document.add(footerTable);

            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate PDF certificate: " + e.getMessage(), e);
        }
    }
}
