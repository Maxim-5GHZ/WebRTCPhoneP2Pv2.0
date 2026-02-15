package com.example.demo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Главный класс приложения Spring Boot.
 */
@SpringBootApplication
public class DemoApplication {

	/**
	 * Основной метод, который запускает приложение Spring Boot.
	 * @param args Аргументы командной строки.
	 */
	public static void main(String[] args) {
		SpringApplication.run(DemoApplication.class, args);
	}
}