package com.example.demo.scheduler;

import com.example.demo.service.EscalationService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class EscalationJob {

    private final EscalationService escalationService;

    @Autowired
    public EscalationJob(EscalationService escalationService) {
        this.escalationService = escalationService;
    }

    /**
     * Runs every 30 seconds to check for unacknowledged events
     * that have exceeded the 2-minute threshold.
     */
    @Scheduled(fixedRate = 30000)
    public void checkForUnacknowledgedEvents() {
        log.debug("Running escalation check...");
        escalationService.checkAndEscalateAll();
    }
}
