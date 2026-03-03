package configs;

import org.kurento.client.KurentoClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class KurentoConfig {

    @Value("${kurento.ws.uri}")
    private String kurentoWsUri;

    @Bean(destroyMethod = "destroy")
    public KurentoClient kurentoClient() {
        return KurentoClient.create(kurentoWsUri);
    }
}