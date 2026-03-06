package controllers;

import models.Toggle2FAResponse;
import models.User;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import repositories.UserRepository;
import services.TwoFactorAuthenticationService;

@RestController
@RequestMapping("/api/user")
public class UserController {

    private final TwoFactorAuthenticationService twoFactorAuthenticationService;
    private final UserRepository userRepository;

    public UserController(TwoFactorAuthenticationService twoFactorAuthenticationService, UserRepository userRepository) {
        this.twoFactorAuthenticationService = twoFactorAuthenticationService;
        this.userRepository = userRepository;
    }

    @PostMapping("/2fa/toggle")
    public ResponseEntity<Toggle2FAResponse> toggle2FA() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String currentPrincipalName = authentication.getName();
        User user = userRepository.findByLogin(currentPrincipalName)
                .orElseThrow(() -> new RuntimeException("User not found"));

        twoFactorAuthenticationService.toggle2FA(user);

        String message = user.isTwoFactorEnabled() ? "2FA is now enabled." : "2FA is now disabled.";
        Toggle2FAResponse response = new Toggle2FAResponse(user.isTwoFactorEnabled(), message);

        return ResponseEntity.ok(response);
    }
}
