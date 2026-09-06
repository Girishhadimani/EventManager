package com.example.EventManager.service;

import com.example.EventManager.entity.Event;
import com.example.EventManager.entity.EventRegistration;
import com.example.EventManager.enums.EventStatus;
import com.example.EventManager.enums.RegistrationStatus;
import com.example.EventManager.repository.EventRepository;
import com.example.EventManager.repository.RegistrationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class EventReminderScheduler {

    private final EventRepository eventRepository;
    private final RegistrationRepository registrationRepository;
    private final EmailService emailService;

    /**
     * Automated reminder job running every hour.
     * Dispatches 24-hour reminder emails to all confirmed attendees for tomorrow's events.
     */
    @Scheduled(cron = "0 0 * * * *")
    @Transactional
    public void processUpcomingEventReminders() {
        int count = sendRemindersForDate(LocalDate.now().plusDays(1));
        if (count > 0) {
            log.info("[EVENT REMINDER SCHEDULER] Successfully processed {} event reminders.", count);
        }
    }

    /**
     * Dispatch reminders for all approved events on a target date.
     * Returns number of reminder emails dispatched.
     */
    @Transactional
    public int sendRemindersForDate(LocalDate targetDate) {
        List<Event> upcomingEvents = eventRepository.findByDateAndStatus(targetDate, EventStatus.APPROVED);
        if (upcomingEvents.isEmpty()) {
            return 0;
        }

        int dispatchedCount = 0;
        List<RegistrationStatus> eligibleStatuses = List.of(RegistrationStatus.CONFIRMED, RegistrationStatus.REGISTERED);

        for (Event event : upcomingEvents) {
            List<EventRegistration> pendingReminders = registrationRepository
                    .findByEventAndStatusInAndReminderSentFalse(event, eligibleStatuses);

            for (EventRegistration reg : pendingReminders) {
                try {
                    emailService.sendEventReminder(reg);
                    reg.setReminderSent(true);
                    registrationRepository.save(reg);
                    dispatchedCount++;
                } catch (Exception e) {
                    log.error("[EVENT REMINDER SCHEDULER] Failed to send reminder for registration #{}: {}",
                            reg.getId(), e.getMessage());
                }
            }
        }

        return dispatchedCount;
    }
}
