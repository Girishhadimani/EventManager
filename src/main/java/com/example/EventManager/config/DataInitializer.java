package com.example.EventManager.config;

import com.example.EventManager.entity.Club;
import com.example.EventManager.entity.Event;
import com.example.EventManager.entity.SiteSettings;
import com.example.EventManager.entity.User;
import com.example.EventManager.enums.EventStatus;
import com.example.EventManager.enums.EventType;
import com.example.EventManager.enums.Role;
import com.example.EventManager.enums.ToolType;
import com.example.EventManager.repository.ClubRepository;
import com.example.EventManager.repository.EventRepository;
import com.example.EventManager.repository.SiteSettingsRepository;
import com.example.EventManager.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Set;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final ClubRepository clubRepository;
    private final EventRepository eventRepository;
    private final SiteSettingsRepository siteSettingsRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        // Seed SiteSettings if missing
        if (siteSettingsRepository.count() == 0) {
            SiteSettings settings = SiteSettings.builder().build();
            siteSettingsRepository.save(settings);
            log.info("Initialized default SiteSettings.");
        }

        // Only seed if no users exist (fresh DB)
        if (userRepository.count() > 0) {
            return;
        }

        log.info("Fresh database detected! Seeding initial clubs, users, and sample events...");

        // 1. Seed Clubs
        Club codingClub = clubRepository.save(Club.builder()
                .name("Coding Club")
                .description("Official Computer Science & Competitive Programming Club")
                .logo("code-tech")
                .category("Technical & Innovation")
                .detailedDescription("Fosters algorithmic problem solving, software engineering, hackathon culture, and open-source contributions.")
                .meetingSchedule("Every Wednesday, 5:00 PM - 6:30 PM")
                .venue("Lab 5, CS Block")
                .eligibility("Open to all engineering students")
                .build());

        Club roboticsClub = clubRepository.save(Club.builder()
                .name("Robotics Club")
                .description("Autonomous robotics, drone systems, and combat bots")
                .logo("robotics")
                .category("Technical & Innovation")
                .detailedDescription("Hands-on embedded systems, ROS, circuit prototyping, and national robotics competitions.")
                .meetingSchedule("Every Thursday, 5:00 PM - 7:00 PM")
                .venue("Robotics Center, Mech Block")
                .eligibility("All departments welcome")
                .build());

        clubRepository.save(Club.builder()
                .name("Design & Arts Club")
                .description("UI/UX, digital media, graphic design, and fine arts")
                .logo("palette")
                .category("Creative Arts & Design")
                .detailedDescription("Graphic design workshops, Figma sprints, product design critiques, and campus visual installations.")
                .meetingSchedule("Fridays, 4:30 PM")
                .venue("Design Studio, Main Building")
                .eligibility("All creative minds")
                .build());

        clubRepository.save(Club.builder()
                .name("Sports & Fitness Club")
                .description("Inter-college sports, athletics, and fitness tournaments")
                .logo("sports")
                .category("Sports & Athletics")
                .detailedDescription("Badminton, football, cricket leagues, and annual college sports festival.")
                .meetingSchedule("Mon/Wed/Fri 6:00 AM & 5:00 PM")
                .venue("College Sports Complex")
                .eligibility("All active students")
                .build());

        clubRepository.save(Club.builder()
                .name("Literary Society")
                .description("Debating, Model UN, creative writing, and public speaking")
                .logo("book-open")
                .category("Literary & Public Speaking")
                .detailedDescription("Parliamentary debates, MUN delegations, creative writing circles, and spoken word events.")
                .meetingSchedule("Tuesdays, 5:15 PM")
                .venue("Auditorium Seminar Hall")
                .eligibility("Open to all")
                .build());

        // 2. Seed Users for All 4 Roles
        User admin = userRepository.save(User.builder()
                .name("Admin Developer")
                .email("admin@college.edu")
                .password(passwordEncoder.encode("admin123"))
                .role(Role.DEVELOPER)
                .enabled(true)
                .createdAt(LocalDateTime.now())
                .build());

        User coordinator = userRepository.save(User.builder()
                .name("Rahul Sharma")
                .email("coordinator@college.edu")
                .password(passwordEncoder.encode("coord123"))
                .role(Role.COORDINATOR)
                .club(codingClub)
                .enabled(true)
                .createdAt(LocalDateTime.now())
                .build());

        User faculty = userRepository.save(User.builder()
                .name("Dr. Ramesh Gupta")
                .email("faculty@college.edu")
                .password(passwordEncoder.encode("faculty123"))
                .role(Role.FACULTY_COORDINATOR)
                .enabled(true)
                .createdAt(LocalDateTime.now())
                .build());

        userRepository.save(User.builder()
                .name("Priya Patel")
                .email("student@college.edu")
                .password(passwordEncoder.encode("student123"))
                .role(Role.USER)
                .usn("2GI21CS001")
                .mobileNumber("9876543210")
                .yearOfStudy(3)
                .enabled(true)
                .createdAt(LocalDateTime.now())
                .build());

        // 3. Seed Sample Events
        eventRepository.save(Event.builder()
                .title("Annual Campus Hackathon 2026")
                .description("Build innovative tech solutions in 24 hours. Tracks include AI/ML, Web3, FinTech, and Smart Campus.")
                .date(LocalDate.now().plusDays(7))
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(18, 0))
                .venue("Silver Jubilee Auditorium")
                .eventType(EventType.HACKATHON)
                .tools(Set.of(ToolType.QUIZ_ENGINE, ToolType.FILE_SUBMISSION, ToolType.LEADERBOARD))
                .status(EventStatus.APPROVED)
                .maxParticipants(150)
                .activityPoints(20)
                .registrationDeadline(LocalDate.now().plusDays(6))
                .club(codingClub)
                .createdBy(coordinator)
                .reviewedBy(faculty)
                .build());

        eventRepository.save(Event.builder()
                .title("Autonomous Rover & Drone Workshop")
                .description("Build and calibrate autonomous obstacle-avoidance rovers using Arduino, ESP32, and ultrasonic sensors.")
                .date(LocalDate.now().plusDays(14))
                .startTime(LocalTime.of(10, 0))
                .endTime(LocalTime.of(16, 0))
                .venue("Robotics Innovation Lab")
                .eventType(EventType.WORKSHOP)
                .tools(Set.of(ToolType.FILE_SUBMISSION, ToolType.ATTENDANCE, ToolType.CERTIFICATE))
                .status(EventStatus.APPROVED)
                .maxParticipants(60)
                .activityPoints(10)
                .registrationDeadline(LocalDate.now().plusDays(12))
                .club(roboticsClub)
                .createdBy(coordinator)
                .reviewedBy(faculty)
                .build());

        log.info("Default seed completed successfully! Ready for login.");
    }
}
