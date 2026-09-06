package com.example.EventManager.service;

import com.example.EventManager.entity.Event;
import com.example.EventManager.entity.EventRegistration;
import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;

@Service
@Slf4j
public class EmailService {

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${app.mail.enabled:false}")
    private boolean mailEnabled;

    @Value("${spring.mail.username:noreply@klsgit.edu}")
    private String fromEmail;

    @Value("${app.base-url:http://localhost:8080}")
    private String baseUrl;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("EEEE, MMMM d, yyyy");

    /**
     * Send event registration confirmation email asynchronously.
     */
    @Async
    public void sendRegistrationConfirmation(EventRegistration reg) {
        if (reg == null || reg.getEvent() == null) {
            return;
        }

        String recipientEmail = reg.getStudentEmail();
        if (recipientEmail == null || recipientEmail.isBlank()) {
            if (reg.getUser() != null) {
                recipientEmail = reg.getUser().getEmail();
            }
        }

        if (recipientEmail == null || recipientEmail.isBlank()) {
            log.warn("[EMAIL SERVICE] No recipient email found for registration #{}", reg.getId());
            return;
        }

        Event event = reg.getEvent();
        String eventTitle = event.getTitle();
        String regNumber = reg.getRegistrationNumber() != null ? reg.getRegistrationNumber() : "REG-" + reg.getId();
        String studentName = reg.getStudentName() != null ? reg.getStudentName() : (reg.getUser() != null ? reg.getUser().getName() : "Student");
        String eventDate = event.getDate() != null ? event.getDate().format(DATE_FORMATTER) : "Upcoming";
        String venue = event.getVenue() != null ? event.getVenue() : "Main Campus, KLS GIT";
        String clubName = event.getClub() != null ? event.getClub().getName() : "KLS GIT Club";
        int activityPoints = event.getEffectiveActivityPoints();

        String subject = String.format("Registration Confirmed: %s [%s]", eventTitle, regNumber);

        String htmlContent = buildRegistrationEmailHtml(
                studentName,
                eventTitle,
                regNumber,
                eventDate,
                venue,
                clubName,
                activityPoints,
                reg.getStatus().name()
        );

        sendHtmlEmail(recipientEmail, subject, htmlContent);
    }

    /**
     * Send 24-hour event reminder email asynchronously.
     */
    @Async
    public void sendEventReminder(EventRegistration reg) {
        if (reg == null || reg.getEvent() == null) {
            return;
        }

        String recipientEmail = reg.getStudentEmail();
        if (recipientEmail == null || recipientEmail.isBlank()) {
            if (reg.getUser() != null) {
                recipientEmail = reg.getUser().getEmail();
            }
        }

        if (recipientEmail == null || recipientEmail.isBlank()) {
            return;
        }

        Event event = reg.getEvent();
        String eventTitle = event.getTitle();
        String regNumber = reg.getRegistrationNumber() != null ? reg.getRegistrationNumber() : "REG-" + reg.getId();
        String studentName = reg.getStudentName() != null ? reg.getStudentName() : (reg.getUser() != null ? reg.getUser().getName() : "Student");
        String eventDate = event.getDate() != null ? event.getDate().format(DATE_FORMATTER) : "Tomorrow";
        String venue = event.getVenue() != null ? event.getVenue() : "Main Campus, KLS GIT";

        String subject = String.format("Reminder: '%s' takes place tomorrow! [%s]", eventTitle, regNumber);

        String htmlContent = buildReminderEmailHtml(
                studentName,
                eventTitle,
                regNumber,
                eventDate,
                venue,
                event.getEffectiveActivityPoints()
        );

        sendHtmlEmail(recipientEmail, subject, htmlContent);
    }

    private void sendHtmlEmail(String recipientEmail, String subject, String htmlContent) {
        if (!mailEnabled || mailSender == null) {
            log.info("[EMAIL SERVICE - SIMULATION MODE] Mail dispatch to: '{}' | Subject: '{}' | Mail enabled: {}",
                    recipientEmail, subject, mailEnabled);
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(recipientEmail);
            helper.setSubject(subject);
            helper.setText(htmlContent, true);

            mailSender.send(message);
            log.info("[EMAIL SERVICE] Dispatched email successfully to '{}' with subject '{}'", recipientEmail, subject);
        } catch (Exception e) {
            log.warn("[EMAIL SERVICE] Could not send live email to '{}' (Reason: {}). Falling back to safe simulation mode.",
                    recipientEmail, e.getMessage());
        }
    }

    private String buildRegistrationEmailHtml(String studentName, String eventTitle, String regNumber,
                                              String eventDate, String venue, String clubName,
                                              int activityPoints, String status) {
        String template = """
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 24px; }
                .card { max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 16px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
                .header { background: linear-gradient(135deg, #1e3a8a, #0284c7); padding: 32px 24px; text-align: center; }
                .header h1 { margin: 0; font-size: 20px; color: #ffffff; letter-spacing: 1px; }
                .header p { margin: 6px 0 0; color: #bae6fd; font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; }
                .content { padding: 28px 24px; color: #cbd5e1; line-height: 1.6; }
                .badge { display: inline-block; background: #10b981; color: white; padding: 4px 12px; border-radius: 9999px; font-weight: bold; font-size: 12px; margin-bottom: 16px; }
                .ticket-box { background: #0f172a; border-radius: 12px; border: 1px dashed #38bdf8; padding: 20px; margin: 20px 0; text-align: center; }
                .ticket-code { font-size: 24px; font-weight: 800; color: #38bdf8; letter-spacing: 2px; font-family: monospace; }
                .info-grid { width: 100%; border-collapse: collapse; margin: 16px 0; }
                .info-grid td { padding: 8px 0; border-bottom: 1px solid #334155; font-size: 14px; }
                .label { color: #94a3b8; width: 35%; font-weight: 600; }
                .value { color: #f8fafc; }
                .footer { background: #0f172a; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #1e293b; }
              </style>
            </head>
            <body>
              <div class="card">
                <div class="header">
                  <h1>KLS GOGTE INSTITUTE OF TECHNOLOGY</h1>
                  <p>Event Registration Confirmation</p>
                </div>
                <div class="content">
                  <div class="badge">STATUS: %s</div>
                  <p>Dear <strong>%s</strong>,</p>
                  <p>Your registration for <strong>%s</strong> has been successfully received and recorded in the college database.</p>
                  
                  <div class="ticket-box">
                    <div style="font-size: 12px; color: #94a3b8; margin-bottom: 4px; text-transform: uppercase;">Your Registration Number</div>
                    <div class="ticket-code">%s</div>
                    <div style="font-size: 11px; color: #64748b; margin-top: 6px;">Keep this ticket code handy or present your digital QR pass at the entrance.</div>
                  </div>

                  <table class="info-grid">
                    <tr><td class="label">Event</td><td class="value"><strong>%s</strong></td></tr>
                    <tr><td class="label">Organizing Club</td><td class="value">%s</td></tr>
                    <tr><td class="label">Date & Time</td><td class="value">%s</td></tr>
                    <tr><td class="label">Venue</td><td class="value">%s</td></tr>
                    <tr><td class="label">VTU AICTE Points</td><td class="value"><span style="color:#fbbf24; font-weight:bold;">%d Activity Points</span></td></tr>
                  </table>

                  <p style="font-size: 13px; color: #94a3b8;">You can view and present your digital QR code ticket pass anytime from your <a href="%s/user.html" style="color:#38bdf8;">Student Dashboard</a>.</p>
                </div>
                <div class="footer">
                  KLS Gogte Institute of Technology &bull; Udyambag, Belagavi, Karnataka &bull; Automated Campus Registry
                </div>
              </div>
            </body>
            </html>
            """;
        return String.format(template, status, studentName, eventTitle, regNumber, eventTitle, clubName, eventDate, venue, activityPoints, baseUrl);
    }

    private String buildReminderEmailHtml(String studentName, String eventTitle, String regNumber,
                                          String eventDate, String venue, int activityPoints) {
        String template = """
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 24px; }
                .card { max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 16px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
                .header { background: linear-gradient(135deg, #d97706, #b45309); padding: 32px 24px; text-align: center; }
                .header h1 { margin: 0; font-size: 20px; color: #ffffff; letter-spacing: 1px; }
                .header p { margin: 6px 0 0; color: #fde68a; font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; }
                .content { padding: 28px 24px; color: #cbd5e1; line-height: 1.6; }
                .ticket-box { background: #0f172a; border-radius: 12px; border: 1px dashed #f59e0b; padding: 20px; margin: 20px 0; text-align: center; }
                .ticket-code { font-size: 24px; font-weight: 800; color: #f59e0b; letter-spacing: 2px; font-family: monospace; }
                .info-grid { width: 100%; border-collapse: collapse; margin: 16px 0; }
                .info-grid td { padding: 8px 0; border-bottom: 1px solid #334155; font-size: 14px; }
                .label { color: #94a3b8; width: 35%; font-weight: 600; }
                .value { color: #f8fafc; }
                .footer { background: #0f172a; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #1e293b; }
              </style>
            </head>
            <body>
              <div class="card">
                <div class="header">
                  <h1>EVENT REMINDER: TOMORROW</h1>
                  <p>KLS Gogte Institute of Technology</p>
                </div>
                <div class="content">
                  <p>Hello <strong>%s</strong>,</p>
                  <p>This is a reminder that the event <strong>%s</strong> is scheduled for tomorrow!</p>

                  <div class="ticket-box">
                    <div style="font-size: 12px; color: #94a3b8; margin-bottom: 4px; text-transform: uppercase;">Ticket Number</div>
                    <div class="ticket-code">%s</div>
                  </div>

                  <table class="info-grid">
                    <tr><td class="label">Event</td><td class="value"><strong>%s</strong></td></tr>
                    <tr><td class="label">Date</td><td class="value">%s</td></tr>
                    <tr><td class="label">Venue</td><td class="value">%s</td></tr>
                    <tr><td class="label">VTU Points</td><td class="value"><span style="color:#fbbf24; font-weight:bold;">%d Points upon attendance</span></td></tr>
                  </table>

                  <p style="font-size: 13px; color: #94a3b8;">Please arrive 15 minutes before the start time with your college USN ID and digital QR ticket pass from your <a href="%s/user.html" style="color:#f59e0b;">Dashboard</a>.</p>
                </div>
                <div class="footer">
                  KLS Gogte Institute of Technology &bull; Udyambag, Belagavi, Karnataka
                </div>
              </div>
            </body>
            </html>
            """;
        return String.format(template, studentName, eventTitle, regNumber, eventTitle, eventDate, venue, activityPoints, baseUrl);
    }
}
