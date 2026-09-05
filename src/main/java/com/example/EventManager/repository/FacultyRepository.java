package com.example.EventManager.repository;

import com.example.EventManager.entity.Faculty;
import com.example.EventManager.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FacultyRepository extends JpaRepository<Faculty, Long> {
    Optional<Faculty> findByEmail(String email);
    boolean existsByEmail(String email);
    List<Faculty> findByAddedBy(User addedBy);
}
