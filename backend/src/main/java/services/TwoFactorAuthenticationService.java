package services;

import models.User;
import org.springframework.stereotype.Service;
import repositories.UserRepository;

import java.time.LocalDateTime;
import java.util.Random;

@Service
public class TwoFactorAuthenticationService {

    private final UserRepository userRepository;

    public TwoFactorAuthenticationService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public String generateTwoFactorCode(User user) {
        String code = String.format("%06d", new Random().nextInt(999999));
        user.setTwoFactorCode(code);
        user.setTwoFactorCodeExpires(LocalDateTime.now().plusMinutes(15));
        userRepository.save(user);
        return code;
    }

    public boolean isTwoFactorCodeValid(User user, String code) {
        return code.equals(user.getTwoFactorCode()) &&
                user.getTwoFactorCodeExpires().isAfter(LocalDateTime.now());
    }

    public void clearTwoFactorCode(User user) {
        user.setTwoFactorCode(null);
        user.setTwoFactorCodeExpires(null);
        userRepository.save(user);
    }
}
