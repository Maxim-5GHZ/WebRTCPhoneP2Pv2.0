package main; // Или ваш текущий пакет

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication
// ВАЖНО: Указываем Spring сканировать соседние пакеты
@ComponentScan(basePackages = {"controllers", "configs", "services", "repositories", "models", "main"})
@EnableJpaRepositories(basePackages = "repositories")
@EntityScan(basePackages = "models")
public class Main {

	public static void main(String[] args) {
		SpringApplication.run(Main.class, args);
	}
}