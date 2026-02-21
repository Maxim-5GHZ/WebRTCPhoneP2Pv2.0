
package controllers;

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

import java.util.List;
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
                    if (user.isTwoFactorEnabled()) {
                        String code = twoFactorAuthenticationService.generateTwoFactorCode(user);
                        emailService.sendTwoFactorCode(user.getLogin(), code);
                        return ResponseEntity.ok(new LoginResponse("2FA_REQUIRED", null));
                    }
                    String token = jwtService.generateToken(user.getLogin());
                    return ResponseEntity.ok(new LoginResponse("Authentication successful", token));
                })
                .orElse(ResponseEntity.status(401).build());
    }

    @PostMapping("/verify-2fa")
    public ResponseEntity<?> verify2fa(@Valid @RequestBody Verify2FARequest request) {
        return userRepository.findByLogin(request.getLogin())
                .filter(user -> twoFactorAuthenticationService.isTwoFactorCodeValid(user, request.getCode()))
                .map(user -> {
                    twoFactorAuthenticationService.clearTwoFactorCode(user);
                    String token = jwtService.generateToken(user.getLogin());
                    return ResponseEntity.ok(new LoginResponse("Authentication successful", token));
                })
                .orElse(ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new LoginResponse("Invalid 2FA code", null)));
    }

    @PostMapping("/toggle-2fa")
    public ResponseEntity<?> toggleTwoFactor() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String currentPrincipalName = authentication.getName();
        User user = userRepository.findByLogin(currentPrincipalName).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        user.setTwoFactorEnabled(!user.isTwoFactorEnabled());
        userRepository.save(user);

        String message = "Two-factor authentication has been " + (user.isTwoFactorEnabled() ? "enabled" : "disabled");
        return ResponseEntity.ok(new TwoFactorResponse(message, user.isTwoFactorEnabled()));
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