package com.example.EventManager.service;

import com.example.EventManager.dto.FacultyRequest;
import com.example.EventManager.entity.Faculty;
import com.example.EventManager.entity.User;
import com.example.EventManager.exception.ResourceNotFoundException;
import com.example.EventManager.repository.FacultyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class FacultyService {

    private final FacultyRepository facultyRepository;

    public List<Faculty> getAllFaculty() {
        return facultyRepository.findAll();
    }

    public Faculty getFacultyById(Long id) {
        return facultyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Faculty", id));
    }

    /**
     * Add a new faculty member.
     * Only FACULTY_COORDINATOR or DEVELOPER can call this.
     * The addedBy field records who created the record.
     */
    public Faculty addFaculty(FacultyRequest request, User addedBy) {
        if (facultyRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Faculty with email already exists: " + request.getEmail());
        }

        Faculty faculty = Faculty.builder()
                .name(request.getName())
                .email(request.getEmail())
                .department(request.getDepartment())
                .designation(request.getDesignation())
                .addedBy(addedBy)
                .build();

        return facultyRepository.save(faculty);
    }

    public Faculty updateFaculty(Long id, FacultyRequest request) {
        Faculty faculty = getFacultyById(id);
        if (request.getName() != null) faculty.setName(request.getName().trim());
        if (request.getEmail() != null) faculty.setEmail(request.getEmail().trim());
        if (request.getDepartment() != null) faculty.setDepartment(request.getDepartment().trim());
        if (request.getDesignation() != null) faculty.setDesignation(request.getDesignation().trim());
        return facultyRepository.save(faculty);
    }

    public void deleteFaculty(Long id) {
        Faculty faculty = getFacultyById(id);
        facultyRepository.delete(faculty);
    }
}
