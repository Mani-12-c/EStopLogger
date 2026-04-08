package com.example.demo.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class DuplicateAckException extends RuntimeException {

    public DuplicateAckException(Long eventId) {
        super(String.format("Event %d has already been acknowledged", eventId));
    }
}
