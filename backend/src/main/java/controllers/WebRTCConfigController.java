package controllers;

import models.IceServer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

@RestController
@RequestMapping("/api/v1/webrtc")
public class WebRTCConfigController {

    @Value("${webrtc.stun.server.url}")
    private String stunServerUrl;

    @Value("${webrtc.turn.server.url}")
    private String turnServerUrl;

    @Value("${webrtc.turn.secret}")
    private String turnSecret;

    // TURN credentials validity in seconds (e.g., 10 minutes)
    private static final long TURN_CREDENTIALS_VALIDITY = 600;

    @GetMapping("/ice-servers")
    public ResponseEntity<List<IceServer>> getIceServers(@RequestParam(name = "useTurn", required = false, defaultValue = "false") boolean useTurn) {
        List<IceServer> iceServers = new ArrayList<>();

        // Always add STUN server
        iceServers.add(new IceServer(stunServerUrl));

        // Add TURN server if requested
        if (useTurn) {
            try {
                // Generate time-limited credentials for TURN
                long timestamp = (System.currentTimeMillis() / 1000) + TURN_CREDENTIALS_VALIDITY;
                String username = String.valueOf(timestamp);

                Mac sha1Hmac = Mac.getInstance("HmacSHA1");
                SecretKeySpec secretKey = new SecretKeySpec(turnSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA1");
                sha1Hmac.init(secretKey);
                byte[] hmac = sha1Hmac.doFinal(username.getBytes(StandardCharsets.UTF_8));
                String password = Base64.getEncoder().encodeToString(hmac);

                iceServers.add(new IceServer(turnServerUrl, username, password));
            } catch (NoSuchAlgorithmException | InvalidKeyException e) {
                // Log the exception and potentially fall back or return an error
                System.err.println("Error generating TURN credentials: " + e.getMessage());
                // For simplicity, we don't add the TURN server if credential generation fails
            }
        }

        return ResponseEntity.ok(iceServers);
    }
}
