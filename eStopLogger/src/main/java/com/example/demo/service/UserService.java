package com.example.demo.service;

import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.model.dto.LoginRequestDTO;
import com.example.demo.model.dto.LoginResponseDTO;
import com.example.demo.model.dto.RegisterRequestDTO;
import com.example.demo.model.entity.AppUser;
import com.example.demo.model.entity.Station;
import com.example.demo.repository.StationRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.security.JwtUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
public class UserService {

    private final UserRepository userRepository;
    private final StationRepository stationRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;

    @Autowired
    public UserService(UserRepository userRepository,
                       StationRepository stationRepository,
                       PasswordEncoder passwordEncoder,
                       JwtUtil jwtUtil,
                       AuthenticationManager authenticationManager) {
        this.userRepository = userRepository;
        this.stationRepository = stationRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.authenticationManager = authenticationManager;
    }

    /**
     * Authenticates a user and returns a JWT token.
     */
    public LoginResponseDTO login(LoginRequestDTO request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword()));

        AppUser user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", request.getUsername()));

        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", user.getUserId());
        claims.put("role", user.getRole().name());
        if (user.getAssignedStation() != null) {
            claims.put("assignedStationId", user.getAssignedStation().getStationId());
        }
        if (user.getShift() != null) {
            claims.put("shift", user.getShift().name());
        }

        String token = jwtUtil.generateToken(user.getUsername(), claims);

        return LoginResponseDTO.builder()
                .token(token)
                .role(user.getRole().name())
                .userId(user.getUserId())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .assignedStationId(user.getAssignedStation() != null
                        ? user.getAssignedStation().getStationId() : null)
                .shift(user.getShift() != null ? user.getShift().name() : null)
                .build();
    }

    /**
     * Registers a new user.
     */
    @Transactional
    public LoginResponseDTO register(RegisterRequestDTO request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException("Username already exists: " + request.getUsername());
        }

        Station assignedStation = null;
        if (request.getAssignedStationId() != null) {
            assignedStation = stationRepository.findById(request.getAssignedStationId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Station", "id", request.getAssignedStationId()));
        }

        AppUser user = AppUser.builder()
                .username(request.getUsername())
                .password(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .role(request.getRole())
                .assignedStation(assignedStation)
                .shift(request.getShift())
                .build();

        userRepository.save(user);
        log.info("User registered: {} ({})", user.getUsername(), user.getRole());

        // Auto-login after registration
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", user.getUserId());
        claims.put("role", user.getRole().name());
        if (assignedStation != null) {
            claims.put("assignedStationId", assignedStation.getStationId());
        }
        if (user.getShift() != null) {
            claims.put("shift", user.getShift().name());
        }

        String token = jwtUtil.generateToken(user.getUsername(), claims);

        return LoginResponseDTO.builder()
                .token(token)
                .role(user.getRole().name())
                .userId(user.getUserId())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .assignedStationId(assignedStation != null ? assignedStation.getStationId() : null)
                .shift(user.getShift() != null ? user.getShift().name() : null)
                .build();
    }
}
