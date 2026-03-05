package configs;

import enums.UserRole;
import models.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import repositories.UserRepository;

@Component
public class AdminUserInitializer implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(AdminUserInitializer.class);

    private final UserRepository userRepository;

    @Value("${app.admin.initial-login}")
    private String adminLogin;

    public AdminUserInitializer(UserRepository userRepository) {
        this.userRepository = userRepository;
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
            () -> logger.warn("Initial admin user with login '{}' not found in the database. Please create the user first.", adminLogin)
        );
    }
}
