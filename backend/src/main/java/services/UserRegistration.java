package services;

import models.User;
import repositories.UserRepository;
import enums.UserRole;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class UserRegistration {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    // Внедряем зависимости через конструктор
    public UserRegistration(UserRepository userRepository, PasswordEncoder passwordEncoder, EmailService emailService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
    }

    /**
     * Генерирует хеш из сырого пароля.
     */
    public String generateHashFromPassword(String rawPassword) {
        return passwordEncoder.encode(rawPassword);
    }

    /**
     * Пример метода регистрации нового пользователя
     */
    public User registerNewUser(String username, String login, String rawPassword) {
        if (!MailCheck.isAllowed(login)) {
            throw new RuntimeException("Запрещенный почтовый домен");
        }

        
        // 2. Хешируем пароль
        String hashedPassword = generateHashFromPassword(rawPassword);

        // 3. Создаем объект пользователя (используем ваш конструктор)
        User newUser = new User(username, login, hashedPassword, UserRole.Base);

        String token = UUID.randomUUID().toString();
        newUser.setVerificationToken(token);
        newUser.setVerificationTokenExpires(LocalDateTime.now().plusHours(24));

        // 4. Сохраняем в БД
        userRepository.save(newUser);

        // 5. Отправляем письмо с подтверждением
        emailService.sendVerificationEmail(newUser.getLogin(), token);
        
        return newUser;
    }

    /**
     * Метод для проверки пароля при входе (логине)
     */
    public boolean verifyPassword(String rawPassword, String encodedPassword) {
        return passwordEncoder.matches(rawPassword, encodedPassword);
    }
}