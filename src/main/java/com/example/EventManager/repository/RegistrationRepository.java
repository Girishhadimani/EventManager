package com.example.EventManager.repository;

import com.example.EventManager.entity.Event;
import com.example.EventManager.entity.EventRegistration;
import com.example.EventManager.entity.User;
import com.example.EventManager.enums.RegistrationStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RegistrationRepository extends JpaRepository<EventRegistration, Long> {

    // All registrations for a specific student
    List<EventRegistration> findByUser(User user);
    List<EventRegistration> findByUserOrderByRegisteredAtDesc(User user);

    // All registrations for an event
    List<EventRegistration> findByEvent(Event event);
    List<EventRegistration> findByEventOrderByRegisteredAtAsc(Event event);

    // Check if student is already registered
    boolean existsByUserAndEvent(User user, Event event);
    boolean existsByUserAndEventAndStatusNot(User user, Event event, RegistrationStatus status);

    // Find specific registration
    Optional<EventRegistration> findByUserAndEvent(User user, Event event);
    Optional<EventRegistration> findByUser_IdAndEvent_Id(Long userId, Long eventId);

    // Find by human-readable registration number (e.g. REG-2026-00182)
    Optional<EventRegistration> findByRegistrationNumber(String registrationNumber);

    // Find by QR code token / data
    Optional<EventRegistration> findByQrCodeData(String qrCodeData);

    // Counts for event capacity & attendance analytics
    long countByEvent(Event event);
    long countByEventAndStatus(Event event, RegistrationStatus status);

    // Auto-promote earliest waitlisted participant
    Optional<EventRegistration> findFirstByEventAndStatusOrderByRegisteredAtAsc(Event event, RegistrationStatus status);
}
