package com.example.EventManager.service;

import com.example.EventManager.dto.ClubProfileDTO;
import com.example.EventManager.dto.ClubRequest;
import com.example.EventManager.entity.Club;
import com.example.EventManager.entity.Event;
import com.example.EventManager.entity.User;
import com.example.EventManager.enums.EventStatus;
import com.example.EventManager.enums.Role;
import com.example.EventManager.exception.ResourceNotFoundException;
import com.example.EventManager.repository.ClubRepository;
import com.example.EventManager.repository.EventRepository;
import com.example.EventManager.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ClubService {

    private final ClubRepository clubRepository;
    private final EventRepository eventRepository;
    private final UserRepository userRepository;

    public List<Club> getAllClubs() {
        return clubRepository.findAll();
    }

    public Club getClubById(Long id) {
        return clubRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Club", id));
    }

    public ClubProfileDTO getClubProfile(Long id) {
        Club club = getClubById(id);
        List<Event> allClubEvents = eventRepository.findByClub_IdOrderByDateDesc(id);
        List<User> clubMembers = userRepository.findByClub_Id(id);

        List<String> studentCoordinators = clubMembers.stream()
                .filter(u -> u.getRole() == Role.COORDINATOR)
                .map(u -> u.getName() + " (" + u.getEmail() + ")")
                .collect(Collectors.toList());

        User faculty = clubMembers.stream()
                .filter(u -> u.getRole() == Role.FACULTY_COORDINATOR)
                .findFirst()
                .orElse(null);

        LocalDate today = LocalDate.now();
        List<Event> upcoming = allClubEvents.stream()
                .filter(e -> e.getDate() != null && !e.getDate().isBefore(today))
                .filter(e -> e.getStatus() != EventStatus.REJECTED && e.getStatus() != EventStatus.CANCELLED)
                .collect(Collectors.toList());

        List<Event> past = allClubEvents.stream()
                .filter(e -> (e.getDate() != null && e.getDate().isBefore(today)) || e.getStatus() == EventStatus.COMPLETED)
                .collect(Collectors.toList());

        // ── Resolve profile fields: entity data wins, then smart defaults by name ──
        String category = resolveField(club.getCategory(), computeCategory(club.getName()));
        String detailedDesc = resolveField(club.getDetailedDescription(), computeDetailedDesc(club.getName(), club.getDescription()));
        List<String> pillars = computePillars(club.getName());
        String schedule = resolveField(club.getMeetingSchedule(), computeSchedule(club.getName()));
        String venue = resolveField(club.getVenue(), computeVenue(club.getName()));
        String eligibility = resolveField(club.getEligibility(), "Open to all enrolled students at KLS GIT Belgaum");

        String facName = club.getFacultyCoordinatorName() != null && !club.getFacultyCoordinatorName().isBlank()
                ? club.getFacultyCoordinatorName()
                : (faculty != null ? faculty.getName() : "Dr. Rajesh Kulkarni");
        String facEmail = club.getFacultyCoordinatorEmail() != null && !club.getFacultyCoordinatorEmail().isBlank()
                ? club.getFacultyCoordinatorEmail()
                : (faculty != null ? faculty.getEmail() : "faculty@college.edu");

        List<String> coords = studentCoordinators.isEmpty()
                ? List.of("Bhargav Mahesh (Coordinator)")
                : studentCoordinators;

        String banner = resolveField(club.getBannerUrl(),
                "https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=1200&q=80");

        return ClubProfileDTO.builder()
                .id(club.getId())
                .name(club.getName())
                .description(club.getDescription())
                .logo(club.getLogo())
                .category(category)
                .bannerUrl(banner)
                .facultyCoordinatorName(facName)
                .facultyCoordinatorEmail(facEmail)
                .studentCoordinators(coords)
                .totalEvents(allClubEvents.size())
                .followerCount(180 + (int)(club.getId() * 35))
                .upcomingEvents(upcoming)
                .pastEvents(past)
                .detailedDescription(detailedDesc)
                .pillars(pillars)
                .meetingSchedule(schedule)
                .venue(venue)
                .eligibility(eligibility)
                .achievements(Arrays.asList(
                        "Recognized as a Premier Student Organization for Academic Excellence",
                        "Over 500+ student engagements across hands-on workshops and contests",
                        "Hosted National Collegiate Innovation Hackathon with 40+ teams"
                ))
                .announcements(Arrays.asList(
                        "Registration open for upcoming flagship events. RSVP early to secure seats!",
                        "Join our weekly campus meetup every Wednesday at 5:00 PM."
                ))
                .build();
    }

    public Club createClub(ClubRequest request) {
        if (clubRepository.existsByName(request.getName())) {
            throw new IllegalArgumentException("Club already exists with name: " + request.getName());
        }
        Club club = Club.builder()
                .name(request.getName())
                .description(request.getDescription())
                .logo(request.getLogo())
                .category(request.getCategory())
                .detailedDescription(request.getDetailedDescription())
                .bannerUrl(request.getBannerUrl())
                .facultyCoordinatorName(request.getFacultyCoordinatorName())
                .facultyCoordinatorEmail(request.getFacultyCoordinatorEmail())
                .studentCoordinatorName(request.getStudentCoordinatorName())
                .studentCoordinatorEmail(request.getStudentCoordinatorEmail())
                .meetingSchedule(request.getMeetingSchedule())
                .venue(request.getVenue())
                .eligibility(request.getEligibility())
                .build();
        return clubRepository.save(club);
    }

    public Club updateClub(Long id, ClubRequest request) {
        Club club = getClubById(id);
        club.setName(request.getName());
        club.setDescription(request.getDescription());
        club.setLogo(request.getLogo());
        club.setCategory(request.getCategory());
        club.setDetailedDescription(request.getDetailedDescription());
        club.setBannerUrl(request.getBannerUrl());
        club.setFacultyCoordinatorName(request.getFacultyCoordinatorName());
        club.setFacultyCoordinatorEmail(request.getFacultyCoordinatorEmail());
        club.setStudentCoordinatorName(request.getStudentCoordinatorName());
        club.setStudentCoordinatorEmail(request.getStudentCoordinatorEmail());
        club.setMeetingSchedule(request.getMeetingSchedule());
        club.setVenue(request.getVenue());
        club.setEligibility(request.getEligibility());
        return clubRepository.save(club);
    }

    public void deleteClub(Long id) {
        Club club = getClubById(id);
        clubRepository.delete(club);
    }

    // ── Helper: prefer entity field, fall back to computed default ───────────

    private String resolveField(String entityValue, String fallback) {
        return (entityValue != null && !entityValue.isBlank()) ? entityValue : fallback;
    }

    private String computeCategory(String name) {
        String n = name.toLowerCase();
        if (n.contains("literary") || n.contains("debate") || n.contains("mun") || n.contains("book"))
            return "Literary & Oratory Society";
        if (n.contains("code") || n.contains("coding") || n.contains("program"))
            return "Technology & AI Society";
        if (n.contains("robot") || n.contains("drone"))
            return "Robotics & Hardware Engineering";
        if (n.contains("design") || n.contains("art"))
            return "Creative Arts & Digital Media";
        if (n.contains("sport") || n.contains("cricket") || n.contains("football") || n.contains("fit"))
            return "Sports & Fitness Society";
        if (n.contains("dance") || n.contains("music") || n.contains("drama") || n.contains("cult"))
            return "Cultural & Performing Arts";
        return "Technical & Innovation";
    }

    private String computeDetailedDesc(String name, String description) {
        if (description != null && !description.isBlank()) return description;
        String n = name.toLowerCase();
        if (n.contains("literary") || n.contains("debate"))
            return "The Literary Society at KLS Gogte Institute of Technology is dedicated to nurturing articulate, analytical, and persuasive communicators. We conduct parliamentary debates, MUN delegations, creative writing workshops, and poetry slams.";
        if (n.contains("code") || n.contains("coding"))
            return "The official Computer Science and Competitive Programming hub at KLS GIT Belgaum. We organize 24-hour hackathons, algorithmic coding sprints, open-source bootcamps, and full-stack development workshops.";
        if (n.contains("robot"))
            return "The premier robotics and hardware engineering club at KLS GIT Belgaum. Dedicated to autonomous systems, aerial drone design, combat bots, IoT hardware, and 3D prototyping for national competitions.";
        if (n.contains("design") || n.contains("art"))
            return "The creative heartbeat of KLS GIT Belgaum, bringing together digital UI/UX designers, visual storytellers, and motion animators to shape impactful campus media and branding.";
        return "A premier student society at KLS Gogte Institute of Technology, Belgaum. We drive innovation, collaboration, and excellence across campus events, workshops, and competitions.";
    }

    private List<String> computePillars(String name) {
        String n = name.toLowerCase();
        if (n.contains("literary") || n.contains("debate"))
            return Arrays.asList("🗣️ Parliamentary Debates", "🌐 Model United Nations", "✍️ Creative Writing", "🎙️ Public Speaking", "📜 Slam Poetry");
        if (n.contains("code") || n.contains("coding"))
            return Arrays.asList("💻 Competitive Programming", "🚀 24-Hour Hackathons", "🌐 Full-Stack Workshops", "🤖 Open Source Bootcamps", "💼 Technical Interview Prep");
        if (n.contains("robot"))
            return Arrays.asList("🤖 Autonomous Robotics", "🛸 Aerial Drone Systems", "⚔️ Robo-Wars Combat Bots", "🔌 Embedded Systems & IoT", "🦾 3D Printing & CAD");
        if (n.contains("design"))
            return Arrays.asList("🎨 UI/UX Design & Figma", "🖌️ Graphic Design", "🎬 Motion Graphics & Video", "🖼️ Fine Arts & Canvas", "💡 Design Thinking Sprints");
        if (n.contains("sport"))
            return Arrays.asList("⚽ Intercollegiate Football", "🏏 GIT Cricket Championship", "🏀 Basketball & Badminton Leagues", "🏃 Track & Field Athletics", "🧘 Campus Wellness & Yoga");
        return Arrays.asList("🏆 Campus Competitions", "📚 Knowledge Workshops", "🤝 Community Projects", "🎯 Skill Development", "🌟 Leadership Training");
    }

    private String computeSchedule(String name) {
        String n = name.toLowerCase();
        if (n.contains("code") || n.contains("coding")) return "Every Tuesday & Thursday, 5:30 PM – 7:00 PM";
        if (n.contains("design")) return "Every Monday, 5:00 PM – 6:30 PM";
        if (n.contains("robot")) return "Every Friday, 4:30 PM – 6:30 PM";
        if (n.contains("sport")) return "Daily Morning & Evening Practice Sessions";
        return "Every Wednesday, 5:00 PM – 6:30 PM";
    }

    private String computeVenue(String name) {
        String n = name.toLowerCase();
        if (n.contains("code") || n.contains("coding")) return "Advanced Computing Lab / CSE Department";
        if (n.contains("robot")) return "Robotics & Mechatronics Lab, Mechanical Engineering Block";
        if (n.contains("design")) return "Design Studio & Digital Media Lab, KLS GIT";
        if (n.contains("sport")) return "GIT Sports Complex, Gymnasium & Athletic Grounds";
        return "Silver Jubilee Auditorium / Central Seminar Hall";
    }
}
