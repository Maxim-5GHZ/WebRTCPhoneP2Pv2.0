package configs;

import enums.UserRole;
import models.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import repositories.UserRepository;

@Component
public class AdminUserInitializer implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(AdminUserInitializer.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.initial-login}")
    private String adminLogin;

    @Value("${app.admin.initial-password}")
    private String adminPassword;

    public AdminUserInitializer(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) throws Exception {
        if (adminLogin == null || adminLogin.isEmpty()) {
            logger.warn("Initial admin login not specified in properties (app.admin.initial-login). Skipping admin role assignment.");
            return;
        }

        userRepository.findByLogin(adminLogin).ifPresentOrElse(
            user -> {
                if (user.getRole() != UserRole.Admin) {
                    user.setRole(UserRole.Admin);
                    userRepository.save(user);
                    logger.info("Granted ADMIN role to user '{}' (ID: {})", user.getLogin(), user.getId());
                } else {
                    logger.info("User '{}' already has ADMIN role.", user.getLogin());
                }
            },
            () -> {
                if (adminPassword == null || adminPassword.isEmpty()) {
                    logger.warn("Initial admin password not specified in properties (app.admin.initial-password). Cannot create admin user.");
                    return;
                }
                User adminUser = new User("admin", adminLogin, passwordEncoder.encode(adminPassword), UserRole.Admin);
                userRepository.save(adminUser);
                logger.info("Created initial admin user with login '{}'", adminLogin);
            }
        );
    }
}
