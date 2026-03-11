package controllers;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonObject;
import models.User;
import org.kurento.client.IceCandidate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import repositories.UserRepository;
import services.webrtc.Room;
import services.webrtc.RoomManager;
import services.webrtc.UserRegistry;
import services.webrtc.UserSession;

import java.io.IOException;
import java.util.ArrayList;
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
    private final Map<Long, String> userConnectionType = new ConcurrentHashMap<>();
    private final Map<String, List<Long>> connectionTypeUsers = new ConcurrentHashMap<>();
    private final Object callLock = new Object();
    private final ObjectMapper objectMapper;
    private final UserRepository userRepository;

    @Autowired
    private RoomManager roomManager;

    @Autowired
    private UserRegistry registry;
    private static final Gson gson = new GsonBuilder().create();


    /**
     * Конструктор для внедрения зависимостей. @param objectMapper-объект для сопоставления JSON.
     *
     * @param userRepository
     */
    public SocketHandler(ObjectMapper objectMapper,
                         UserRepository userRepository) {
        this.objectMapper = objectMapper;
        this.userRepository = userRepository;
        connectionTypeUsers.put("CONFERENCE", new ArrayList<>());
        connectionTypeUsers.put("P2P", new ArrayList<>());
        connectionTypeUsers.put("BROADCAST", new ArrayList<>());
    }

    /**
     * Вызывается после успешного установления соединения WebSocket.
     *
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
     *
     * @param session Закрытый сеанс.
     * @param status  Статус закрытия.
     */
    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws IOException {
        Long userId = getUserId(session);
        if (userId != null) {
            String connectionType = userConnectionType.get(userId);
            if (connectionType != null) {
                connectionTypeUsers.get(connectionType).remove(userId);
                userConnectionType.remove(userId);
                broadcastUserList(connectionType);
            }

            synchronized (callLock) {
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
            }

            logger.info("[Disconnected] User ID: {}", userId);

            // Уведомляем всех остальных пользователей об отключении
            broadcast(Map.of("type", "user-disconnected", "userId", userId));
        }
        UserSession user = registry.removeBySession(session);
        if (user != null) {
            Room room = roomManager.getRoom(user.getRoomName());
            room.leave(user);
        }
    }

    private void broadcast(Map<String, Object> message) {
        String jsonMessage;
        try {
            jsonMessage = objectMapper.writeValueAsString(message);
        } catch (IOException e) {
            logger.error("Error serializing broadcast message", e);
            return;
        }

        sessions.values().forEach(session -> {
            try {
                synchronized (session) {
                    if (session.isOpen()) {
                        session.sendMessage(new TextMessage(jsonMessage));
                    }
                }
            } catch (IOException e) {
                logger.error("Error broadcasting message to session {}: {}", session.getId(), e.getMessage());
            }
        });
    }

    /**
     * Обрабатывает входящие текстовые сообщения WebSocket.
     *
     * @param session Сеанс, отправивший сообщение.
     * @param message Полученное сообщение.
     */
    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        Long fromUserId = getUserId(session);
        if (fromUserId == null) return;

        JsonObject jsonMessage = gson.fromJson(message.getPayload(), JsonObject.class);
        String type = jsonMessage.has("type") ? jsonMessage.get("type").getAsString() : jsonMessage.get("id").getAsString();

        switch (type) {
            case "select_connection_type":
                handleSelectConnectionType(fromUserId, jsonMessage.get("connectionType").getAsString());
                break;
            case "join_room":
                joinRoom(jsonMessage, session, fromUserId);
                break;
            case "start_broadcast":
                startBroadcast(jsonMessage, session, fromUserId);
                break;
            case "offer":
                sendToUser(jsonMessage, fromUserId);
                break;
            case "answer":
                sendToUser(jsonMessage, fromUserId);
                break;
            case "candidate":
                sendToUser(jsonMessage, fromUserId);
                break;
            case "leaveRoom":
                leaveRoom(registry.getBySession(session));
                break;
            case "onIceCandidate":
                JsonObject candidate = jsonMessage.get("candidate").getAsJsonObject();
                UserSession user = registry.getBySession(session);
                if (user != null) {
                    IceCandidate cand = new IceCandidate(candidate.get("candidate").getAsString(),
                            candidate.get("sdpMid").getAsString(), candidate.get("sdpMLineIndex").getAsInt());
                    user.addCandidate(cand, jsonMessage.get("name").getAsString());
                }
                break;
            case "call-user":
                handleCallUser(session, fromUserId, getToUserId(jsonMessage.get("to")), objectMapper.readValue(message.getPayload(), HashMap.class), sessions.get(getToUserId(jsonMessage.get("to"))));
                break;
            case "make-answer":
                handleMakeAnswer(fromUserId, getToUserId(jsonMessage.get("to")), objectMapper.readValue(message.getPayload(), HashMap.class), sessions.get(getToUserId(jsonMessage.get("to"))));
                break;
            case "ice-candidate":
                handleIceCandidate(fromUserId, getToUserId(jsonMessage.get("to")), objectMapper.readValue(message.getPayload(), HashMap.class), sessions.get(getToUserId(jsonMessage.get("to"))));
                break;
            case "hang-up":
                handleHangUp(fromUserId, getToUserId(jsonMessage.get("to")), sessions.get(getToUserId(jsonMessage.get("to"))));
                break;
            default:
                logger.warn("Unknown message type: {}", type);
        }
    }

    private void sendToUser(JsonObject message, Long fromUserId) {
        Long toUserId = getToUserId(message.get("to"));
        if (toUserId == null) {
            logger.warn("Recipient user ID ('to') is missing or invalid in payload: {}", message);
            return;
        }
        WebSocketSession toSession = sessions.get(toUserId);
        if (toSession != null && toSession.isOpen()) {
            message.addProperty("from", fromUserId.toString());
            sendMessage(toSession, message.toString());
        }
    }
    
        private void joinRoom(JsonObject params, WebSocketSession session, Long userId) throws IOException {
        String roomName = params.get("roomId").getAsString();
        Room room = roomManager.getRoom(roomName);
        User user = userRepository.findById(userId).orElseThrow();
        final UserSession userSession = room.join(user.getUsername(), session, "");
        registry.register(userSession);

        // Notify others in the room
        for (UserSession otherUser : room.getParticipants()) {
            if (!otherUser.getName().equals(userSession.getName())) {
                sendMessage(otherUser.getSession(), Map.of("type", "user_joined", "userId", userSession.getName()));
            }
        }
    }

    private void startBroadcast(JsonObject params, WebSocketSession session, Long userId) throws IOException {
        String roomName = params.get("roomId").getAsString();
        Room room = roomManager.getRoom(roomName);
        User user = userRepository.findById(userId).orElseThrow();
        final UserSession userSession = room.join(user.getUsername(), session, "");
        registry.register(userSession);

        // Notify all users in the BROADCAST group
        List<Long> broadcastUsers = connectionTypeUsers.get("BROADCAST");
        for (Long broadcastUserId : broadcastUsers) {
            if (!broadcastUserId.equals(userId)) {
                WebSocketSession broadcastUserSession = sessions.get(broadcastUserId);
                if (broadcastUserSession != null && broadcastUserSession.isOpen()) {
                    sendMessage(broadcastUserSession, Map.of("type", "start_broadcast", "userId", user.getUsername()));
                }
            }
        }
    }

    private void handleSelectConnectionType(Long userId, String connectionType) {
        // Удаляем пользователя из предыдущей группы, если он там был
        String oldConnectionType = userConnectionType.get(userId);
        if (oldConnectionType != null) {
            connectionTypeUsers.get(oldConnectionType).remove(userId);
            broadcastUserList(oldConnectionType);
        }

        // Добавляем пользователя в новую группу
        userConnectionType.put(userId, connectionType);
        connectionTypeUsers.get(connectionType).add(userId);
        broadcastUserList(connectionType);
    }

    private void broadcastUserList(String connectionType) {
        List<Long> userIds = connectionTypeUsers.get(connectionType);
        List<User> users = userRepository.findAllById(userIds);
        List<Map<String, Object>> usersMap = users.stream()
                .map(user -> {
                    Map<String, Object> userMap = new HashMap<>();
                    userMap.put("id", user.getId());
                    userMap.put("username", user.getUsername());
                    userMap.put("inCall", userInCallStatus.getOrDefault(user.getId(), false));
                    return userMap;
                })
                .collect(Collectors.toList());

        Map<String, Object> message = Map.of("type", "user_list", "connectionType", connectionType, "users", usersMap);

        for (Long userId : userIds) {
            WebSocketSession session = sessions.get(userId);
            if (session != null && session.isOpen()) {
                sendMessage(session, message);
            }
        }
    }

    private void joinRoom(JsonObject params, WebSocketSession session) throws IOException {
        final String roomName = params.get("room").getAsString();
        final String name = params.get("name").getAsString();
        final String sdpOffer = params.get("sdpOffer").getAsString();
        logger.info("PARTICIPANT {}: trying to join room {}", name, roomName);

        Room room = roomManager.getRoom(roomName);
        final UserSession user = room.join(name, session, sdpOffer);
        registry.register(user);
    }

    private void leaveRoom(UserSession user) throws IOException {
        final Room room = roomManager.getRoom(user.getRoomName());
        room.leave(user);
        if (room.getParticipants().isEmpty()) {
            roomManager.removeRoom(room);
        }
    }


    private void handleCallUser(WebSocketSession fromSession, Long fromUserId, Long toUserId, Map<String, Object> payload, WebSocketSession recipient) {
        synchronized (callLock) {
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
                Map<String, Object> messageMap = new HashMap<>();
                messageMap.put("type", "call-made");
                messageMap.put("offer", offer);
                messageMap.put("from", fromUserId);
                // Forward the useTurn flag if it exists
                if (payload.containsKey("useTurn")) {
                    messageMap.put("useTurn", payload.get("useTurn"));
                }
                sendMessage(recipient, messageMap);
            }
        }
    }

    private void handleMakeAnswer(Long fromUserId, Long toUserId, Map<String, Object> payload, WebSocketSession recipient) {
        if (!userPeers.containsKey(fromUserId) || !userPeers.get(fromUserId).equals(toUserId)) {
            logger.warn("User {} is not in a call with user {}", fromUserId, toUserId);
            return;
        }
        // Просто пересылаем ответ
        Object answer = payload.get("answer");
        Map<String, Object> messageMap = new HashMap<>();
        messageMap.put("type", "answer-made");
        messageMap.put("answer", answer);
        messageMap.put("from", fromUserId);
        // Forward the useTurn flag if it exists
        if (payload.containsKey("useTurn")) {
            messageMap.put("useTurn", payload.get("useTurn"));
        }
        sendMessage(recipient, messageMap);
    }

    private void handleIceCandidate(Long fromUserId, Long toUserId, Map<String, Object> payload, WebSocketSession recipient) {
        if (!userPeers.containsKey(fromUserId) || !userPeers.get(fromUserId).equals(toUserId)) {
            logger.warn("User {} is not in a call with user {}", fromUserId, toUserId);
            return;
        }
        // Просто пересылаем ICE-кандидата
        Object candidate = payload.get("candidate");
        sendMessage(recipient, Map.of("type", "ice-candidate", "candidate", candidate, "from", fromUserId));
    }

    private void handleHangUp(Long fromUserId, Long toUserId, WebSocketSession recipient) {
        synchronized (callLock) {
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
     *
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