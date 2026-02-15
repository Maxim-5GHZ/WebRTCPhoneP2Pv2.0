package com.example.demo;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Контроллер, который обрабатывает корневой URL-адрес.
 */
@Controller
public class RootController {

    /**
     * Обрабатывает GET-запросы к корневому URL-адресу.
     * @param model Модель для передачи данных в представление.
     * @return Имя представления для рендеринга.
     */
    @GetMapping("/")
    public String GetRoot(Model model){
        return"index.html";
    }

}
