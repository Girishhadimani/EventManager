package com.example.EventManager.Controller;

import com.example.EventManager.dto.FacultyRequest;
import com.example.EventManager.entity.Faculty;
import com.example.EventManager.entity.User;
import com.example.EventManager.service.FacultyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/faculty")
@RequiredArgsConstructor
public class FacultyController {

    private final FacultyService facultyService;

    @GetMapping
    @PreAuthorize("hasAnyRole('DEVELOPER', 'FACULTY_COORDINATOR')")
    public ResponseEntity<List<Faculty>> getAllFaculty() {
        return ResponseEntity.ok(facultyService.getAllFaculty());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('DEVELOPER', 'FACULTY_COORDINATOR')")
    public ResponseEntity<Faculty> getFaculty(@PathVariable Long id) {
        return ResponseEntity.ok(facultyService.getFacultyById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('DEVELOPER', 'FACULTY_COORDINATOR')")
    public ResponseEntity<Faculty> addFaculty(
            @Valid @RequestBody FacultyRequest request,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(facultyService.addFaculty(request, currentUser));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('DEVELOPER', 'FACULTY_COORDINATOR')")
    public ResponseEntity<Faculty> updateFaculty(
            @PathVariable Long id,
            @Valid @RequestBody FacultyRequest request) {
        return ResponseEntity.ok(facultyService.updateFaculty(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('DEVELOPER')")
    public ResponseEntity<Void> deleteFaculty(@PathVariable Long id) {
        facultyService.deleteFaculty(id);
        return ResponseEntity.noContent().build();
    }
}
