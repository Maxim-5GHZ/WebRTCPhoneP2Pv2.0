package controllers;

import com.fasterxml.jackson.databind.ObjectMapper;
import models.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import repositories.UserRepository;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Обработчик WebSocket для обработки сигнализации WebRTC.
 */
@Component
public class SocketHandler extends TextWebSocketHandler {

    private static final Logger logger = LoggerFactory.getLogger(SocketHandler.class);
    private final Map<Long, WebSocketSession> sessions = new ConcurrentHashMap<>();
    private final Map<Long, Boolean> userInCallStatus = new ConcurrentHashMap<>();
    private final Map<Long, Long> userPeers = new ConcurrentHashMap<>(); // Карта для отслеживания пиров
    private final ObjectMapper objectMapper;
    private final UserRepository userRepository;


    /**
     * Конструктор для внедрения зависимостей. @param objectMapper-объект для сопоставления JSON.
     * @param userRepository
     */
    public SocketHandler(ObjectMapper objectMapper,
                         UserRepository userRepository) {
        this.objectMapper = objectMapper;
        this.userRepository = userRepository;
    }

    /**
     * Вызывается после успешного установления соединения WebSocket.
     * @param session Установленный сеанс.
     */
    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        Long userId = getUserId(session);
        if (userId == null) {
            try {
                session.close(CloseStatus.POLICY_VIOLATION.withReason("User ID not found in session"));
            } catch (IOException e) {
                logger.error("Error closing session without user ID", e);
            }
            return;
        }
        sessions.put(userId, session);
        userInCallStatus.put(userId, false); // Инициализация статуса звонка
        logger.info("[Connected] User ID: {}", userId);

        // Уведомляем нового пользователя о его успещном подключении и отправляем ему список всех пользователей онлайн
        List<User> onlineUsers = userRepository.findAllById(sessions.keySet());
        List<Map<String, Object>> usersMap = onlineUsers.stream()
                .map(user -> {
                    Map<String, Object> userMap = new HashMap<>();
                    userMap.put("id", user.getId());
                    userMap.put("username", user.getUsername());
                    userMap.put("inCall", userInCallStatus.getOrDefault(user.getId(), false));
                    return userMap;
                })
                .collect(Collectors.toList());

        sendMessage(session, Map.of("type", "connection-success", "data", usersMap, "myId", userId));

        // Уведомляем всех остальных пользователей о новом подключенном пользователе
        broadcast(Map.of("type", "user-connected", "userId", userId, "username", userRepository.findById(userId).get().getUsername()));
    }


    /**
     * Вызывается после закрытия соединения WebSocket.
     * @param session Закрытый сеанс.
     * @param status Статус закрытия.
     */
    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        Long userId = getUserId(session);
        if (userId != null) {
            // Если пользователь был в звонке, уведомляем его собеседника
            if (userPeers.containsKey(userId)) {
                Long peerId = userPeers.get(userId);
                WebSocketSession peerSession = sessions.get(peerId);
                if (peerSession != null && peerSession.isOpen()) {
                    sendMessage(peerSession, Map.of("type", "hang-up", "from", userId));
                }
                userPeers.remove(peerId);
                userInCallStatus.put(peerId, false);
                broadcast(Map.of("type", "user-in-call-status-changed", "userId", peerId, "inCall", false));

            }

            sessions.remove(userId);
            userInCallStatus.remove(userId); // Удаление статуса звонка
            userPeers.remove(userId);

            logger.info("[Disconnected] User ID: {}", userId);

            // Уведомляем всех остальных пользователей об отключении
            broadcast(Map.of("type", "user-disconnected", "userId", userId));
        }
    }
    private void broadcast(Map<String, Object> message) {
        sessions.values().forEach(session -> {
            try {
                sendMessage(session, message);
            } catch (Exception e) {
                logger.error("Error broadcasting message to session {}", session.getId(), e);
            }
        });
    }
    /**
     * Обрабатывает входящие текстовые сообщения WebSocket.
     * @param session Сеанс, отправивший сообщение.
     * @param message Полученное сообщение.
     */
    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        try {
            Long fromUserId = getUserId(session);
            if (fromUserId == null) return;

            Map<String, Object> payload = objectMapper.readValue(message.getPayload(), HashMap.class);
            String type = (String) payload.get("type");

            Long toUserId = getToUserId(payload.get("to"));

            if (toUserId == null) {
                logger.warn("Recipient user ID ('to') is missing or invalid in payload: {}", payload);
                return; // Или отправить ошибку отправителю
            }


            WebSocketSession recipient = sessions.get(toUserId);
            if (recipient == null || !recipient.isOpen()) {
                logger.warn("Recipient User ID {} not found or session is closed", toUserId);
                // Можно отправить сообщение об ошибке отправителю
                sendMessage(session, Map.of("type", "error", "message", "User " + toUserId + " is not online."));
                return;
            }

            switch (type) {
                case "call-user":
                    handleCallUser(session, fromUserId, toUserId, payload,recipient);
                    break;
                case "make-answer":
                    handleMakeAnswer(fromUserId, toUserId, payload, recipient);
                    break;
                case "ice-candidate":
                    handleIceCandidate(fromUserId, toUserId, payload, recipient);
                    break;
                case "hang-up":
                    handleHangUp(fromUserId, toUserId, recipient);
                    break;
                default:
                    logger.warn("Unknown message type: {}", type);
            }
        } catch (Exception e) {
            logger.error("Error handling message: {}", e.getMessage(), e);
        }
    }
    private void handleCallUser(WebSocketSession fromSession, Long fromUserId, Long toUserId, Map<String, Object> payload, WebSocketSession recipient) {
        if (userInCallStatus.getOrDefault(toUserId, false)) {
            sendMessage(fromSession, Map.of("type", "call-rejected", "reason", "User is already in a call."));
        } else {
            // Помечаем обоих пользователей как "в звонке"
            userInCallStatus.put(fromUserId, true);
            userInCallStatus.put(toUserId, true);
            //Связываем пользователей в звонке
            userPeers.put(fromUserId, toUserId);
            userPeers.put(toUserId, fromUserId);


            // Уведомляем всех о том что пользователи в звонке
            broadcast(Map.of("type", "user-in-call-status-changed", "userId", fromUserId, "inCall", true));
            broadcast(Map.of("type", "user-in-call-status-changed", "userId", toUserId, "inCall", true));


            // Пересылаем предложение, добавляя от кого оно
            Object offer = payload.get("offer");
            sendMessage(recipient, Map.of("type", "call-made", "offer", offer, "from", fromUserId));
        }
    }

    private void handleMakeAnswer(Long fromUserId, Long toUserId, Map<String, Object> payload, WebSocketSession recipient) {
        if(!userPeers.containsKey(fromUserId) || !userPeers.get(fromUserId).equals(toUserId)){
            logger.warn("User {} is not in a call with user {}", fromUserId, toUserId);
            return;
        }
        // Просто пересылаем ответ
        Object answer = payload.get("answer");
        sendMessage(recipient, Map.of("type", "answer-made", "answer", answer, "from", fromUserId));
    }

    private void handleIceCandidate(Long fromUserId, Long toUserId, Map<String, Object> payload, WebSocketSession recipient) {
        if(!userPeers.containsKey(fromUserId) || !userPeers.get(fromUserId).equals(toUserId)){
            logger.warn("User {} is not in a call with user {}", fromUserId, toUserId);
            return;
        }
        // Просто пересылаем ICE-кандидата
        Object candidate = payload.get("candidate");
        sendMessage(recipient, Map.of("type", "ice-candidate", "candidate", candidate, "from", fromUserId));
    }
    private void handleHangUp(Long fromUserId, Long toUserId, WebSocketSession recipient) {
        // Сбрасываем статус "в звонке" для обоих пользователей
        userInCallStatus.put(fromUserId, false);
        userInCallStatus.put(toUserId, false);

        // Убираем связь
        userPeers.remove(fromUserId);
        userPeers.remove(toUserId);

        // Уведомляем всех о том что пользователи не в звонке
        broadcast(Map.of("type", "user-in-call-status-changed", "userId", fromUserId, "inCall", false));
        broadcast(Map.of("type", "user-in-call-status-changed", "userId", toUserId, "inCall", false));

        // Уведомляем другого пользователя о завершении звонка
        sendMessage(recipient, Map.of("type", "hang-up", "from", fromUserId));
    }


    private Long getToUserId(Object toValue) {
        if (toValue instanceof String) {
            try {
                return Long.parseLong((String) toValue);
            } catch (NumberFormatException e) {
                return null;
            }
        } else if (toValue instanceof Number) {
            return ((Number) toValue).longValue();
        }
        return null;
    }
    /**
     * Отправляет сообщение JSON указанному сеансу.
     * @param session Сеанс для отправки сообщения.
     * @param payload Данные для отправки.
     */
    private void sendMessage(WebSocketSession session, Object payload) {
        try {
            String json = objectMapper.writeValueAsString(payload);
            synchronized (session) { // Синхронизация для потокобезопасности
                if (session.isOpen()) {
                    session.sendMessage(new TextMessage(json));
                }
            }
        } catch (IOException e) {
            logger.error("Failed to send message to User ID {}: {}", getUserId(session), e.getMessage(), e);
        }
    }


    private Long getUserId(WebSocketSession session) {
        return (Long) session.getAttributes().get("userId");
    }

    public java.util.Set<Long> getOnlineUserIds() {
        return sessions.keySet();
    }
    public boolean isUserInCall(Long userId) {
        return userInCallStatus.getOrDefault(userId, false);
    }

    public void setUserInCallStatus(Long userId, boolean inCall) {
        userInCallStatus.put(userId, inCall);
    }
}