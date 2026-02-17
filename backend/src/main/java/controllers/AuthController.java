package controllers;

import jakarta.validation.Valid;
import models.*;
import models.User;
import repositories.UserRepository;
import services.JwtService;
import services.UserRegistration;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRegistration userRegistration;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService; // Добавили сервис

    public AuthController(UserRegistration userRegistration,
                          UserRepository userRepository,
                          PasswordEncoder passwordEncoder,
                          JwtService jwtService) {
        this.userRegistration = userRegistration;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        try {
            User user = userRegistration.registerNewUser(request.getUsername(), request.getLogin(), request.getPassword());
            String token = jwtService.generateToken(user.getLogin());
            return ResponseEntity.ok(new UserResponse(user.getId(), user.getUsername(), user.getLogin(), user.getRole().toString(), token));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        return userRepository.findByLogin(request.getLogin())
                .filter(user -> passwordEncoder.matches(request.getPassword(), user.getPassword()))
                .map(user -> {
                    String token = jwtService.generateToken(user.getLogin());
                    return ResponseEntity.ok(new UserResponse(user.getId(), user.getUsername(), user.getLogin(), user.getRole().toString(), token));
                })
                .orElse(ResponseEntity.status(401).build());
    }
}