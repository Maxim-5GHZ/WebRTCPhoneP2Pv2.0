package controllers;

import enums.UserRole;
import models.User;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import services.AdminService;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasAuthority('Admin')") // Protect all methods in this controller
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    @GetMapping("/users")
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(adminService.getAllUsers());
    }

    @PostMapping("/users/{id}/block")
    public ResponseEntity<?> blockUser(@PathVariable Long id) {
        return adminService.blockUser(id)
                .map(user -> ResponseEntity.ok().build())
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/users/{id}/unblock")
    public ResponseEntity<?> unblockUser(@PathVariable Long id) {
        return adminService.unblockUser(id)
                .map(user -> ResponseEntity.ok().build())
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/users/{id}/role")
    public ResponseEntity<?> changeUserRole(@PathVariable Long id, @RequestBody UserRole newRole) {
        return adminService.changeUserRole(id, newRole)
                .map(user -> ResponseEntity.ok().build())
                .orElse(ResponseEntity.notFound().build());
    }

    // TODO: Implement WebRTC configuration endpoints
    @GetMapping("/config/webrtc")
    public ResponseEntity<?> getWebRTCConfig() {
        // Placeholder
        return ResponseEntity.ok().build();
    }

    @PutMapping("/config/webrtc")
    public ResponseEntity<?> updateWebRTCConfig(@RequestBody Object config) {
        // Placeholder
        return ResponseEntity.ok().build();
    }
}
