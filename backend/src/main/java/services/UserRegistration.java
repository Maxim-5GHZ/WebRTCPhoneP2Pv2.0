package services;

import models.User;
import repositories.UserRepository;
import enums.UserRole;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class UserRegistration {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    // Внедряем зависимости через конструктор
    public UserRegistration(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
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
        // 1. Проверяем, не занят ли логин
        if (userRepository.findByLogin(login).isPresent()) {
            throw new RuntimeException("User with this login already exists");
        }

        // 2. Хешируем пароль
        String hashedPassword = generateHashFromPassword(rawPassword);

        // 3. Создаем объект пользователя (используем ваш конструктор)
        User newUser = new User(username, login, hashedPassword, UserRole.Base);

        // 4. Сохраняем в БД
        return userRepository.save(newUser);
    }

    /**
     * Метод для проверки пароля при входе (логине)
     */
    public boolean verifyPassword(String rawPassword, String encodedPassword) {
        return passwordEncoder.matches(rawPassword, encodedPassword);
    }
}