
package services;

import enums.UserActivate;
import enums.UserRole;
import models.User;
import org.springframework.stereotype.Service;
import repositories.UserRepository;

import java.util.List;
import java.util.Optional;

@Service
public class AdminService {

    private final UserRepository userRepository;

    public AdminService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public Optional<User> blockUser(Long userId) {
        return userRepository.findById(userId).map(user -> {
            user.setActivation(UserActivate.Disable);
            return userRepository.save(user);
        });
    }

    public Optional<User> unblockUser(Long userId) {
        return userRepository.findById(userId).map(user -> {
            user.setActivation(UserActivate.Enable);
            return userRepository.save(user);
        });
    }

    public Optional<User> changeUserRole(Long userId, UserRole newRole) {
        return userRepository.findById(userId).map(user -> {
            user.setRole(newRole);
            return userRepository.save(user);
        });
    }
}
