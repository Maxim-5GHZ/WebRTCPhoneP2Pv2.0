package services;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    @Autowired
    private JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    public void sendTwoFactorCode(String to, String code) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(to);
            message.setSubject("Your Two-Factor Authentication Code");
            message.setText("Your two-factor authentication code is: " + code);
            mailSender.send(message);
            logger.info("2FA code email sent to {}", to);
        } catch (MailException e) {
            logger.error("Failed to send 2FA code email to {}", to, e);
            // Consider re-throwing a custom exception or handling the failure appropriately
        }
    }
}