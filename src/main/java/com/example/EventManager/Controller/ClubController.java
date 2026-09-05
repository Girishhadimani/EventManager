package com.example.EventManager.Controller;

import com.example.EventManager.dto.ClubRequest;
import com.example.EventManager.entity.Club;
import com.example.EventManager.service.ClubService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/clubs")
@RequiredArgsConstructor
public class ClubController {

    private final ClubService clubService;

    @GetMapping
    public ResponseEntity<List<Club>> getAllClubs() {
        return ResponseEntity.ok(clubService.getAllClubs());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Club> getClub(@PathVariable Long id) {
        return ResponseEntity.ok(clubService.getClubById(id));
    }

    @GetMapping("/{id}/profile")
    public ResponseEntity<com.example.EventManager.dto.ClubProfileDTO> getClubProfile(@PathVariable Long id) {
        return ResponseEntity.ok(clubService.getClubProfile(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('DEVELOPER')")
    public ResponseEntity<Club> createClub(@Valid @RequestBody ClubRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(clubService.createClub(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('DEVELOPER')")
    public ResponseEntity<Club> updateClub(@PathVariable Long id, @Valid @RequestBody ClubRequest request) {
        return ResponseEntity.ok(clubService.updateClub(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('DEVELOPER')")
    public ResponseEntity<Void> deleteClub(@PathVariable Long id) {
        clubService.deleteClub(id);
        return ResponseEntity.noContent().build();
    }
}
