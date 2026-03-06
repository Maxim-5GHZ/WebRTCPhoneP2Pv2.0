# WebRTCPhoneP2Pv2.0

Вторая версия P2P телефона Savely на Java Spring & React.ts, по аналогии с Zoom.

## Технологический стек

-   **Бэкенд:** Java 21, Spring Boot, Spring Security, WebSocket, JPA (Hibernate)
-   **Фронтенд:** React.ts, Vite, Nginx (для раздачи статики в production)
-   **База данных:** MariaDB
-   **TURN-сервер:** Coturn
-   **Прокси-сервер:** Nginx
-   **Контейнеризация:** Docker, Docker Compose

---

## Системные требования

-   **Docker**
-   **Docker Compose**
-   **Git**

---

## 1. Конфигурация

Перед первым запуском необходимо настроить переменные окружения.

### Переменные окружения (`.env`)

Создайте файл `.env` в корневой директории проекта. Он будет использоваться для всех сред (development и production).

```env
# Пароли для базы данных MariaDB
MARIADB_ROOT_PASSWORD=your_strong_root_password
MARIADB_DATABASE=webrtc_db
MARIADB_USER=webrtc_user
MARIADB_PASSWORD=your_strong_user_password

# Пароль для почтового ящика (если используется)
MAIL_PASSWORD=your_mail_password

# Секретный пароль для TURN-сервера
# Этот пароль будет использоваться бэкендом для генерации временных учетных данных для клиентов WebRTC.
# Вы можете установить его вручную или использовать скрипт для генерации.
TURN_PASSWORD=your_super_secret_turn_password

# Конфигурация CORS
# Укажите разрешенные источники (origins) для CORS-запросов.
# В режиме разработки можно использовать "*", но для production рекомендуется указать конкретные домены.
# Например: http://localhost:5173,https://your-domain.com
APP_CORS_ALLOWED_ORIGINS=*
```

### Ротация пароля TURN-сервера

В проекте есть скрипт для безопасной генерации и обновления секрета `TURN_PASSWORD`. Он автоматически обновит ваш `.env` файл и перезапустит нужные сервисы.

**Для запуска скрипта выполните:**
```bash
bash ./rotate_turn_password.sh
```
Рекомендуется периодически запускать этот скрипт в production-окружении для повышения безопасности.

---

## 2. Запуск проекта

Проект использует разные файлы `docker-compose` для разделения сред разработки и production.

### Production-окружение

Этот режим предназначен для развертывания на сервере. Он собирает production-ready образы и запускает полный стек сервисов, включая Nginx в качестве прокси.

**Команда для запуска:**
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```
После запуска приложение будет доступно по адресу вашего сервера (например, `https://your_domain.com`).

**Для остановки:**
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml down
```

### Среда для разработки (Development)

Этот режим предназначен для локальной разработки. Он использует `Vite` с горячей перезагрузкой для фронтенда и монтирует исходный код бэкенда в контейнер для отладки.

**Команда для запуска:**
```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build -d
```
После запуска сервисы будут доступны по следующим адресам:
-   **Фронтенд:** `http://localhost:5173`
-   **Бэкенд API:** `http://localhost:8080` (через Nginx, если он запущен)
-   **База данных:** порт `3306` на хосте

**Для остановки:**
```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml down
```

---

## 3. Конфигурация Nginx для Production

Файл `nginx-docker/conf.d/default.conf` уже настроен для работы в production. Он выполняет следующие задачи:
-   Перенаправляет весь HTTP трафик на HTTPS.
-   Проксирует запросы к API (`/api/`) и WebSocket (`/signal`) на бэкенд-сервис.
-   Проксирует все остальные запросы на production-контейнер фронтенда, который раздает статические файлы.

Вам нужно только обеспечить наличие валидных SSL-сертификатов. В `docker-compose.prod.yml` указаны пути к сертификатам, которые вы можете получить, например, с помощью Certbot.

```yaml
# docker-compose.prod.yml
services:
  nginx:
    # ...
    volumes:
      # Замените на реальные пути к вашим сертификатам на хост-машине
      - /etc/letsencrypt/live/webrtc.yourdomain.com/fullchain.pem:/etc/ssl/certs/fullchain.pem:ro
      - /etc/letsencrypt/live/webrtc.yourdomain.com/privkey.pem:/etc/ssl/private/privkey.pem:ro
```