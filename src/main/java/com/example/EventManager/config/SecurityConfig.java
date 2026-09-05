package com.example.EventManager.config;

import com.example.EventManager.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity   // Enables @PreAuthorize on controllers
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;
    private final UserDetailsService userDetailsService;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // Disable CSRF for REST API
            .csrf(AbstractHttpConfigurer::disable)

            // Stateless sessions (JWT handles auth state)
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

            .authorizeHttpRequests(auth -> auth
                // --- Public endpoints ---
                .requestMatchers(
                    "/",
                    "/index.html",
                    "/club.html",
                    "/verify-certificate.html",
                    "/developer.html",
                    "/coordinator.html",
                    "/faculty.html",
                    "/user.html",
                    "/css/**",
                    "/js/**",
                    "/images/**",
                    "/favicon.ico",
                    "/error"
                ).permitAll()
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/certificates/verify/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/events/approved").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/events/*/tools-status").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/clubs").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/clubs/*/profile").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/site-settings").permitAll()

                // --- Developer endpoints (full system access) ---
                .requestMatchers("/api/developer/**").hasRole("DEVELOPER")
                .requestMatchers(HttpMethod.DELETE, "/api/clubs/**").hasRole("DEVELOPER")
                .requestMatchers(HttpMethod.DELETE, "/api/events/**").hasRole("DEVELOPER")

                // --- Club management (DEVELOPER creates clubs) ---
                .requestMatchers(HttpMethod.POST, "/api/clubs").hasRole("DEVELOPER")
                .requestMatchers(HttpMethod.PUT, "/api/clubs/**").hasRole("DEVELOPER")

                // --- Event management ---
                .requestMatchers(HttpMethod.POST, "/api/events").hasAnyRole("DEVELOPER", "COORDINATOR", "FACULTY_COORDINATOR")
                .requestMatchers(HttpMethod.PUT, "/api/events/**").hasAnyRole("DEVELOPER", "COORDINATOR", "FACULTY_COORDINATOR")
                .requestMatchers(HttpMethod.PATCH, "/api/events/**").hasAnyRole("DEVELOPER", "COORDINATOR", "FACULTY_COORDINATOR")

                // --- Faculty management ---
                .requestMatchers("/api/faculty/**").hasAnyRole("DEVELOPER", "FACULTY_COORDINATOR")

                // --- User management ---
                .requestMatchers("/api/users/**").hasRole("DEVELOPER")

                // --- Registrations & Check-ins (governed by @PreAuthorize on controller) ---
                .requestMatchers("/api/registrations/**").authenticated()
                .requestMatchers("/api/events/*/register").authenticated()
                .requestMatchers("/api/events/*/registrations").authenticated()
                .requestMatchers("/api/events/*/check-in").authenticated()

                // --- Read-only access for all authenticated users ---
                .requestMatchers(HttpMethod.GET, "/api/events/**").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/clubs/**").authenticated()
                // --- Modular Specialized Engines ---
                .requestMatchers("/api/coding/**").authenticated()
                .requestMatchers("/api/quiz/**").authenticated()
                .requestMatchers("/api/design/**").authenticated()
                .requestMatchers("/api/submissions/**").authenticated()
                .requestMatchers("/api/evaluations/**").hasAnyRole("DEVELOPER", "FACULTY_COORDINATOR")
                .requestMatchers("/api/leaderboard/**").authenticated()
                .requestMatchers("/api/certificates/**").authenticated()
                .requestMatchers("/api/notifications/**").authenticated()
                .requestMatchers(HttpMethod.PATCH, "/api/events/*/approval/**").hasAnyRole("DEVELOPER", "FACULTY_COORDINATOR")
                .requestMatchers("/api/tools/**").authenticated()

                // Everything else requires authentication
                .anyRequest().authenticated()
            )

            // Plug in the JWT filter before Spring's username/password filter
            .authenticationProvider(authenticationProvider())
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        // Spring Security 7: UserDetailsService is now a constructor argument
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
