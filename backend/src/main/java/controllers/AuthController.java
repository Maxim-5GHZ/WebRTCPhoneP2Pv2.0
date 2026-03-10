
package controllers;

import enums.UserActivate;
import jakarta.validation.Valid;
import models.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import repositories.UserRepository;
import services.EmailService;
import services.JwtService;
import services.TwoFactorAuthenticationService;
import services.UserRegistration;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;


@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRegistration userRegistration;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final SocketHandler socketHandler;
    private final TwoFactorAuthenticationService twoFactorAuthenticationService;
    private final EmailService emailService;

    public AuthController(UserRegistration userRegistration,
                          UserRepository userRepository,
                          PasswordEncoder passwordEncoder,
                          JwtService jwtService,
                          SocketHandler socketHandler,
                          TwoFactorAuthenticationService twoFactorAuthenticationService,
                          EmailService emailService) {
        this.userRegistration = userRegistration;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.socketHandler = socketHandler;
        this.twoFactorAuthenticationService = twoFactorAuthenticationService;
        this.emailService = emailService;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        if (userRepository.findByLogin(request.getLogin()).isPresent()) {
            return ResponseEntity.badRequest().body("User with this login already exists");
        }
        try {
            userRegistration.registerNewUser(request.getUsername(), request.getLogin(), request.getPassword());
            return ResponseEntity.ok("Registration successful. Please check your email to verify your account.");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/verify-email")
    public ResponseEntity<?> verifyEmail(@RequestParam("token") String token) {
        Optional<User> userOptional = userRepository.findByVerificationToken(token);

        if (userOptional.isEmpty()) {
            return ResponseEntity.badRequest().body("Invalid verification token.");
        }

        User user = userOptional.get();

        if (user.getVerificationTokenExpires() == null || user.getVerificationTokenExpires().isBefore(LocalDateTime.now())) {
            return ResponseEntity.badRequest().body("Verification token has expired.");
        }

        user.setActivation(UserActivate.Enable);
        user.setVerificationToken(null);
        user.setVerificationTokenExpires(null);
        userRepository.save(user);

        return ResponseEntity.ok("Email verified successfully! You can now log in.");
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        Optional<User> userOptional = userRepository.findByLogin(request.getLogin());

        if (userOptional.isPresent()) {
            User user = userOptional.get();

            if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Неправильный пароль");
            }

            if (user.getActivation() == UserActivate.Disable) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Account not activated. Please verify your email.");
            }

            try {
                if (user.isTwoFactorEnabled() != null && user.isTwoFactorEnabled()) {
                    String code = twoFactorAuthenticationService.generateTwoFactorCode(user);
                    emailService.sendTwoFactorCode(user.getLogin(), code);
                    return ResponseEntity.ok(new LoginResponse("2FA_REQUIRED", null, user.getLogin(), user.getUsername(), user.getRole().toString(), true));
                }
                String token = jwtService.generateToken(user);
                return ResponseEntity.ok(new LoginResponse("Authentication successful", token, user.getLogin(), user.getUsername(), user.getRole().toString(), Optional.ofNullable(user.isTwoFactorEnabled()).orElse(false)));
            } catch (Exception e) {
                // Log the exception for debugging purposes
                // logger.error("Error during login for user: {}", request.getLogin(), e);
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error during token generation: " + e.getMessage());
            }
        } else {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Неправильный логин или пароль");
        }
    }

    @PostMapping("/verify-2fa")
    public ResponseEntity<?> verify2fa(@Valid @RequestBody Verify2FARequest request) {
        return userRepository.findByLogin(request.getLogin())
                .filter(user -> twoFactorAuthenticationService.isTwoFactorCodeValid(user, request.getCode()))
                .map(user -> {
                    twoFactorAuthenticationService.clearTwoFactorCode(user);
                    String token = jwtService.generateToken(user);
                    return ResponseEntity.ok(new LoginResponse("Authentication successful", token, user.getLogin(), user.getUsername(), user.getRole().toString(), user.isTwoFactorEnabled()));
                })
                .orElse(ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new LoginResponse("Invalid 2FA code", null, null, null, null, false)));
    }

    @GetMapping("/users/online")
    public ResponseEntity<List<OnlineUserResponse>> getOnlineUsers() {
        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        List<Long> onlineUserIds = socketHandler.getOnlineUserIds().stream()
                .collect(Collectors.toList());

        List<OnlineUserResponse> onlineUsers = userRepository.findAllById(onlineUserIds).stream()
                .filter(user -> !user.getLogin().equals(currentUsername))
                .map(user -> new OnlineUserResponse(user.getId(), user.getUsername(), user.getLogin(), user.getRole().toString(), socketHandler.isUserInCall(user.getId())))
                .collect(Collectors.toList());

        return ResponseEntity.ok(onlineUsers);
    }
}