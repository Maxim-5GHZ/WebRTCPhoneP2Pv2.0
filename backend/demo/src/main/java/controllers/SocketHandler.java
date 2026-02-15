package controllers;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Обработчик WebSocket для обработки сигнализации WebRTC.
 */
@Component
public class SocketHandler extends TextWebSocketHandler {

    private static final Logger logger = LoggerFactory.getLogger(SocketHandler.class);
    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper;
    /**
     * Конструктор для внедрения зависимостей. @param objectMapper-объект для сопоставления JSON.
     */
    public SocketHandler(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    /**
     * Вызывается после успешного установления соединения WebSocket.
     * @param session Установленный сеанс.
     * @throws Exception в случае ошибки.
     */
    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        sessions.put(session.getId(), session);
        logger.info("[Connected] Session ID: {}", session.getId());

        // Отправляем клиенту только его собственный ID
        sendMessage(session, Map.of("type", "my-id", "data", session.getId()));
    }

    /**
     * Вызывается после закрытия соединения WebSocket.
     * @param session Закрытый сеанс.
     * @param status Статус закрытия.
     */
    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        sessions.remove(session.getId());
        logger.info("[Disconnected] Session ID: {}", session.getId());
    }

    /**
     * Обрабатывает входящие текстовые сообщения WebSocket.
     * @param session Сеанс, отправивший сообщение.
     * @param message Полученное сообщение.
     */
    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        try {
            Map<String, Object> payload = objectMapper.readValue(message.getPayload(), Map.class);
            String to = (String) payload.get("to");

            if (to != null) {
                WebSocketSession recipient = sessions.get(to);
                if (recipient != null && recipient.isOpen()) {
                    Map<String, Object> newPayload = new HashMap<>(payload);
                    newPayload.put("from", session.getId());
                    sendMessage(recipient, newPayload);
                } else {
                    logger.warn("Recipient {} not found or closed", to);
                }
            }
        } catch (Exception e) {
            logger.error("Error handling message: {}", e.getMessage());
        }
    }

    /**
     * Отправляет сообщение JSON указанному сеансу.
     * @param session Сеанс для отправки сообщения.
     * @param payload Данные для отправки.
     */
    private void sendMessage(WebSocketSession session, Object payload) {
        try {
            String json = objectMapper.writeValueAsString(payload);
            synchronized (session) {
                if (session.isOpen()) {
                    session.sendMessage(new TextMessage(json));
                }
            }
        } catch (IOException e) {
            logger.error("Failed to send message to {}: {}", session.getId(), e.getMessage());
        }
    }
}