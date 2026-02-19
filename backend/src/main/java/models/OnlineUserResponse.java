package models;

public record OnlineUserResponse(Long id, String username, String login, String role, boolean inCall) {
}
