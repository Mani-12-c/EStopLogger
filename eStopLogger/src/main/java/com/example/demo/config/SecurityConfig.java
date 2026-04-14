package com.example.demo.config;

import com.example.demo.security.JwtFilter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtFilter jwtFilter;

    @Autowired
    public SecurityConfig(JwtFilter jwtFilter) {
        this.jwtFilter = jwtFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> {})
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // Public endpoints
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/swagger-ui/**", "/v3/api-docs/**", "/swagger-ui.html").permitAll()
                .requestMatchers("/h2-console/**").permitAll()

                // Dataset endpoints — SUPERVISOR only
                .requestMatchers("/api/datasets/**").hasRole("SUPERVISOR")

                // Analytics endpoints — all authenticated (dashboard needs summary)
                .requestMatchers("/api/analytics/**").authenticated()

                // Audit endpoints — AUDITOR only
                .requestMatchers("/api/audit/**").hasRole("AUDITOR")

                // Resolve (close ticket) — SUPERVISOR only
                .requestMatchers(HttpMethod.POST, "/api/acknowledgements/*/resolve").hasRole("SUPERVISOR")

                // Acknowledgement — OPERATOR or SUPERVISOR
                .requestMatchers("/api/acknowledgements/**").hasAnyRole("OPERATOR", "SUPERVISOR")

                // Event endpoints — OPERATOR and SUPERVISOR
                .requestMatchers("/api/events/**").hasAnyRole("OPERATOR", "SUPERVISOR")

                // Station + Factory endpoints — any authenticated user
                .requestMatchers("/api/stations/**").authenticated()
                .requestMatchers("/api/factories/**").authenticated()

                // Everything else requires authentication
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
            .headers(headers -> headers.frameOptions(frame -> frame.sameOrigin())); // for H2 console

        return http.build();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config)
            throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
