package controllers;

import models.LoginRequest;
import models.RegisterRequest;
import models.UserResponse;
import models.User;
import repositories.UserRepository;
import services.UserRegistration;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRegistration userRegistration;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthController(UserRegistration userRegistration,
                          UserRepository userRepository,
                          PasswordEncoder passwordEncoder) {
        this.userRegistration = userRegistration;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * Эндпоинт для регистрации нового пользователя
     */
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        try {
            User user = userRegistration.registerNewUser(
                    request.username(),
                    request.login(),
                    request.password()
            );
            return ResponseEntity.ok(new UserResponse(
                    user.getId(),
                    user.getUsername(),
                    user.getLogin(),
                    user.getRole().toString()
            ));
        } catch (RuntimeException e) {
            // Если логин занят или другая ошибка
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Эндпоинт для входа
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        Optional<User> userOpt = userRepository.findByLogin(request.login());

        if (userOpt.isPresent()) {
            User user = userOpt.get();
            // Проверяем, совпадает ли введенный пароль с хешем в БД
            if (passwordEncoder.matches(request.pass(), user.getPassword())) {
                return ResponseEntity.ok(new UserResponse(
                        user.getId(),
                        user.getUsername(),
                        user.getLogin(),
                        user.getRole().toString()
                ));
            }
        }

        return ResponseEntity.status(401).body("Неверный логин или пароль");
    }
}