package com.example.EventManager.entity;

import jakarta.persistence.*;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "site_settings")
public class SiteSettings {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "college_name", nullable = false)
    @Builder.Default
    private String collegeName = "KLS Gogte Institute of Technology, Belgaum";

    @Column(name = "tagline")
    @Builder.Default
    private String tagline = "Autonomous Institution under VTU | NAAC A+ Accredited";

    @Column(name = "hero_title")
    @Builder.Default
    private String heroTitle = "KLS GIT College Activity Hub";

    @Column(name = "hero_subtitle", length = 1000)
    @Builder.Default
    private String heroSubtitle = "Everything happening on campus. Discover upcoming hackathons, innovation challenges, workshops, cultural showcases, and student clubs.";

    @Column(name = "announcement_text", length = 1000)
    @Builder.Default
    private String announcementText = "📢 Registrations open for Annual Campus Hackathons, Workshops, and Club Initiatives!";

    @Column(name = "contact_email")
    @Builder.Default
    private String contactEmail = "events@kls.ac.in";

    @Column(name = "contact_phone")
    @Builder.Default
    private String contactPhone = "+91 831 2498500";

    @Column(name = "footer_text")
    @Builder.Default
    private String footerText = "© 2026 KLS Gogte Institute of Technology, Belgaum. All rights reserved.";

    @Column(name = "banner_alert_enabled")
    @Builder.Default
    private boolean bannerAlertEnabled = true;
}
