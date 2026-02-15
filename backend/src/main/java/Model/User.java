package Model;
import Enums.UserActivate;
import jakarta.persistence.*;
import Enums.UserRole;

import static Enums.UserActivate.Disable;
import static Enums.UserActivate.Enable;

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

    @Column(name="role")
    private UserActivate role;


    @Enumerated(EnumType.STRING)
    @Column(name="activation")
    private UserActivate activation;
    public User() {
        this.activation = Disable;
    }


    public User(String username, String login, String password) {
        this.username = username;
        this.login = login;
        this.password = password;
        this.activation = Enable;
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

    public UserActivate getRole() {
        return role;
    }

    public void setRole(UserActivate role) {
        this.role = role;
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
                "role="+role+'\''
                +'}' ;
    }
}