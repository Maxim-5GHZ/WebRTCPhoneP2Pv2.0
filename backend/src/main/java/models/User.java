package models;

import enums.UserActivate;
import jakarta.persistence.*;
import enums.UserRole;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;


    @Column(name = "username", nullable = false)
    private String username;

    @Column(name = "login", nullable = false, unique = true)
    private String login;

    @Column(name = "password", nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(name="role",nullable = false)
    private UserRole role;

    
    @Enumerated(EnumType.STRING)
    @Column(name="activation",nullable = false)
    private UserActivate activation = UserActivate.Disable;

    @Column(name = "verification_token")
    private String verificationToken;

    @Column(name = "verification_token_expires")
    private LocalDateTime verificationTokenExpires;

    @Column(name = "two_factor_code")
    private String twoFactorCode;

    @Column(name = "two_factor_code_expires")
    private LocalDateTime twoFactorCodeExpires;

    @Column(name = "two_factor_enabled", nullable = false)
    private Boolean twoFactorEnabled = true;

    public Boolean isTwoFactorEnabled() {
        return twoFactorEnabled;
    }

    public void setTwoFactorEnabled(Boolean twoFactorEnabled) {
        this.twoFactorEnabled = twoFactorEnabled;
    }



    public User() {

    }


    public User(String username, String login, String password,UserRole role) {
        this.username = username;
        this.login = login;
        this.password = password;
        this.role= role;
        this.twoFactorEnabled = true;
        this.activation = UserActivate.Disable;
    }


    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getLogin() { return login; }
    public void setLogin(String login) { this.login = login; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public UserActivate getActivation() {
        return activation;
    }

    public void setActivation(UserActivate activation) {
        this.activation = activation;
    }

    public UserRole getRole() {
        return role;
    }

    public void setRole(UserRole role) {
        this.role = role;
    }

    public String getTwoFactorCode() {
        return twoFactorCode;
    }

    public void setTwoFactorCode(String twoFactorCode) {
        this.twoFactorCode = twoFactorCode;
    }

    public LocalDateTime getTwoFactorCodeExpires() {
        return twoFactorCodeExpires;
    }

    public void setTwoFactorCodeExpires(LocalDateTime twoFactorCodeExpires) {
        this.twoFactorCodeExpires = twoFactorCodeExpires;
    }

    public String getVerificationToken() {
        return verificationToken;
    }

    public void setVerificationToken(String verificationToken) {
        this.verificationToken = verificationToken;
    }

    public LocalDateTime getVerificationTokenExpires() {
        return verificationTokenExpires;
    }

    public void setVerificationTokenExpires(LocalDateTime verificationTokenExpires) {
        this.verificationTokenExpires = verificationTokenExpires;
    }

    //  Реализация equals и hashCode по ID (защита от ошибок в коллекциях)
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof User user)) return false;
        return id != null && id.equals(user.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }


    @Override
    public String toString() {
        return "User{" +
                "id=" + id +
                ", username='" + username + '\'' +
                ", login='" + login + '\'' +
                ", role=" + role +
                '}';
    }
}