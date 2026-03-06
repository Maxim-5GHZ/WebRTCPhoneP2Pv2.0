package services.webrtc;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

import java.util.concurrent.ConcurrentHashMap;

@Component
public class UserRegistry {

    private final ConcurrentHashMap<String, UserSession> usersBySessionId = new ConcurrentHashMap<>();

    public void register(UserSession user) {
        usersBySessionId.put(user.getSession().getId(), user);
    }

    public UserSession getBySession(WebSocketSession session) {
        return usersBySessionId.get(session.getId());
    }

    public UserSession removeBySession(WebSocketSession session) {
        return usersBySessionId.remove(session.getId());
    }
}
