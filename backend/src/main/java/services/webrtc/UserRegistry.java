package services.webrtc;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

import java.util.concurrent.ConcurrentHashMap;

@Component
public class UserRegistry {

    private final ConcurrentHashMap<String, UserSession> usersBySessionId = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, UserSession> usersByName = new ConcurrentHashMap<>();

    public void register(UserSession user) {
        usersBySessionId.put(user.getSession().getId(), user);
        usersByName.put(user.getName(), user);
    }

    public UserSession getBySession(WebSocketSession session) {
        return usersBySessionId.get(session.getId());
    }

    public UserSession getByName(String name) {
        return usersByName.get(name);
    }

    public UserSession removeBySession(WebSocketSession session) {
        final UserSession user = getBySession(session);
        if (user != null) {
            usersByName.remove(user.getName());
            usersBySessionId.remove(session.getId());
        }
        return user;
    }
}
