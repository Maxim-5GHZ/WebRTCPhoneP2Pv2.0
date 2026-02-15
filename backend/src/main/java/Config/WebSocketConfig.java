package Config;

import Controllers.SocketHandler;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

/**
 * Класс конфигурации WebSocket.
 */
@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final SocketHandler socketHandler;

    @Value("${app.cors.allowed-origins:*}")
    private String[] allowedOrigins;


    public WebSocketConfig(SocketHandler socketHandler) {
        this.socketHandler = socketHandler;
    }

    /**
     * Регистрирует обработчики WebSocket.
     * @param registry Реестр обработчиков WebSocket.
     */
    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(socketHandler, "/signal")
                .setAllowedOrigins(allowedOrigins);
    }
}