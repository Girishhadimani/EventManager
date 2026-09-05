package com.example.EventManager.service;

import com.example.EventManager.dto.RegisterRequest;
import com.example.EventManager.entity.Club;
import com.example.EventManager.entity.User;
import com.example.EventManager.exception.ResourceNotFoundException;
import com.example.EventManager.repository.ClubRepository;
import com.example.EventManager.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final ClubRepository clubRepository;
    private final PasswordEncoder passwordEncoder;

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public User getUserById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", id));
    }

    /**
     * DEVELOPER creates any user with any role.
     */
    public User createUser(RegisterRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new IllegalArgumentException("Email already registered: " + request.getEmail());
        }

        Club club = null;
        if (request.getClubId() != null) {
            club = clubRepository.findById(request.getClubId())
                    .orElseThrow(() -> new ResourceNotFoundException("Club", request.getClubId()));
        }

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(request.getRole())
                .club(club)
                .enabled(true)
                .usn(request.getUsn())
                .mobileNumber(request.getMobileNumber())
                .yearOfStudy(request.getYearOfStudy())
                .department(request.getDepartment())
                .build();

        return userRepository.save(user);
    }

    /**
     * Update user details (DEVELOPER full control)
     */
    public User updateUser(Long id, RegisterRequest request) {
        User user = getUserById(id);

        if (request.getName() != null && !request.getName().isBlank()) {
            user.setName(request.getName().trim());
        }

        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            String newEmail = request.getEmail().trim();
            if (!newEmail.equalsIgnoreCase(user.getEmail())) {
                if (userRepository.findByEmail(newEmail).isPresent()) {
                    throw new IllegalArgumentException("Email already taken: " + newEmail);
                }
                user.setEmail(newEmail);
            }
        }

        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }

        if (request.getRole() != null) {
            user.setRole(request.getRole());
        }

        if (request.getClubId() != null) {
            Club club = clubRepository.findById(request.getClubId())
                    .orElseThrow(() -> new ResourceNotFoundException("Club", request.getClubId()));
            user.setClub(club);
        } else if (request.getRole() != com.example.EventManager.enums.Role.COORDINATOR) {
            user.setClub(null);
        }

        // Student-specific fields
        if (request.getUsn() != null) user.setUsn(request.getUsn().trim());
        if (request.getMobileNumber() != null) user.setMobileNumber(request.getMobileNumber().trim());
        if (request.getYearOfStudy() != null) user.setYearOfStudy(request.getYearOfStudy());
        if (request.getDepartment() != null) user.setDepartment(request.getDepartment().trim());

        return userRepository.save(user);
    }

    public void toggleUserEnabled(Long id) {
        User user = getUserById(id);
        user.setEnabled(!user.isEnabled());
        userRepository.save(user);
    }

    public void deleteUser(Long id) {
        User user = getUserById(id);
        userRepository.delete(user);
    }
}
