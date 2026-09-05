package com.example.EventManager.repository;

import com.example.EventManager.entity.Club;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ClubRepository extends JpaRepository<Club, Long> {
    Optional<Club> findByName(String name);
    boolean existsByName(String name);
}
