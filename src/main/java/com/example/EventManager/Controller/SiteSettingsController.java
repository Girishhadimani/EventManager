package com.example.EventManager.Controller;

import com.example.EventManager.entity.SiteSettings;
import com.example.EventManager.repository.SiteSettingsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/site-settings")
@RequiredArgsConstructor
public class SiteSettingsController {

    private final SiteSettingsRepository siteSettingsRepository;

    @GetMapping
    public ResponseEntity<SiteSettings> getSettings() {
        SiteSettings settings = siteSettingsRepository.findAll().stream().findFirst()
                .orElseGet(() -> siteSettingsRepository.save(new SiteSettings()));
        return ResponseEntity.ok(settings);
    }

    @PutMapping
    @PreAuthorize("hasRole('DEVELOPER')")
    public ResponseEntity<SiteSettings> updateSettings(@RequestBody SiteSettings req) {
        SiteSettings settings = siteSettingsRepository.findAll().stream().findFirst()
                .orElseGet(SiteSettings::new);

        if (req.getCollegeName() != null) settings.setCollegeName(req.getCollegeName().trim());
        if (req.getTagline() != null) settings.setTagline(req.getTagline().trim());
        if (req.getHeroTitle() != null) settings.setHeroTitle(req.getHeroTitle().trim());
        if (req.getHeroSubtitle() != null) settings.setHeroSubtitle(req.getHeroSubtitle().trim());
        if (req.getAnnouncementText() != null) settings.setAnnouncementText(req.getAnnouncementText().trim());
        if (req.getContactEmail() != null) settings.setContactEmail(req.getContactEmail().trim());
        if (req.getContactPhone() != null) settings.setContactPhone(req.getContactPhone().trim());
        if (req.getFooterText() != null) settings.setFooterText(req.getFooterText().trim());
        settings.setBannerAlertEnabled(req.isBannerAlertEnabled());

        return ResponseEntity.ok(siteSettingsRepository.save(settings));
    }
}
