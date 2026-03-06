package models;

public class LoginResponse {
    private String message;
    private String token;
    private String login;
    private String username;
    private String role;
    private boolean isTwoFactorEnabled;

    public LoginResponse(String message, String token, String login, String username, String role, boolean isTwoFactorEnabled) {
        this.message = message;
        this.token = token;
        this.login = login;
        this.username = username;
        this.role = role;
        this.isTwoFactorEnabled = isTwoFactorEnabled;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getLogin() {
        return login;
    }

    public void setLogin(String login) {
        this.login = login;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public boolean isTwoFactorEnabled() {
        return isTwoFactorEnabled;
    }

    public void setTwoFactorEnabled(boolean twoFactorEnabled) {
        isTwoFactorEnabled = twoFactorEnabled;
    }
}
