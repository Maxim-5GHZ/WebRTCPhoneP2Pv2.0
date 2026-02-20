# WebRTCPhoneP2Pv2.0

Вторая версия P2P телефона Savely на Java Spring & React.ts, по аналогии с Zoom.

## Технологический стек

-   **Бэкенд:** Java 21, Spring Boot, Spring Security, WebSocket, JPA (Hibernate)
-   **Фронтенд:** React.ts, Vite
-   **База данных:** MariaDB
-   **Контейнеризация:** Docker, Docker Compose

---

## Системные требования

-   **Docker**
-   **Docker Compose**
-   **Node.js & npm** (для сборки фронтенда)
-   **Git**

---

## Развертывание в Production (на основе реестра образов)

Это рекомендуемый метод развертывания приложения на производственном сервере. Он гарантирует, что на самом сервере не потребуются исходный код или инструменты сборки. Рабочий процесс состоит из локальной сборки образов Docker, их отправки в реестр Docker, а затем извлечения и запуска на сервере.

### Предварительные требования
-   **Локальная машина**: Docker, Docker Compose, Node.js & npm, Git.
-   **Сервер**: Docker, Docker Compose.
-   **Реестр Docker**: Доступ к реестру Docker (например, Docker Hub, GitHub Container Registry, GitLab Container Registry). Вы должны быть авторизованы в своем реестре.

---

### Часть 1: Конфигурация

#### 1. Nginx для HTTPS
Для производственного развертывания вы должны использовать HTTPS. Обновите `nginx-docker/conf.d/default.conf` для обработки SSL и перенаправления HTTP-трафика.

**Замените `webrtc.yourdomain.com` на ваш фактический домен.**

```nginx
# nginx-docker/conf.d/default.conf

# Перенаправление HTTP на HTTPS
server {
    listen 80;
    server_name webrtc.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name webrtc.yourdomain.com;

    # Пути к SSL-сертификатам внутри контейнера
    ssl_certificate /etc/ssl/certs/fullchain.pem;
    ssl_certificate_key /etc/ssl/private/privkey.pem;

    # Усиление безопасности SSL
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256';
    ssl_prefer_server_ciphers off;
    
    # Кэширование статических ресурсов (JS, CSS)
    # Vite добавляет хэш содержимого к этим именам файлов, поэтому они могут кэшироваться долгое время.
    location ~* \.(?:css|js)$ {
        root /usr/share/nginx/dist;
        try_files $uri =404;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Основное расположение для одностраничного приложения
    location / {
        root   /usr/share/nginx/dist;
        index  index.html;
        try_files $uri $uri/ /index.html;
    }

    # Прокси для API-запросов
    location /api/ {
         proxy_pass http://backend:8080/api/;
         proxy_set_header Host $host;
         proxy_set_header X-Real-IP $remote_addr;
         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
         proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Прокси для WebSocket-соединений
    location /signal {
        proxy_pass http://backend:8080/signal;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### 2. Переменные окружения
Создайте файл `.env` в корне проекта. Он будет использоваться как для локальной разработки, так и на производственном сервере.
```env
MARIADB_ROOT_PASSWORD=your_strong_root_password
MARIADB_DATABASE=webrtc_db
MARIADB_USER=webrtc_user
MARIADB_PASSWORD=your_strong_user_password
```

---

### Часть 2: Сборка и отправка образов (локальная машина)

#### Шаг 1: Сборка фронтенд-ресурсов
Сначала создайте статические файлы для фронтенда.
```bash
cd frontend
npm install
npm run build
cd ..
```
Это создает каталог `dist` внутри папки `frontend`, который необходим для сборки образа Nginx.

#### Шаг 2: Сборка и отправка образа бэкенда
Соберите образ бэкенда, пометьте его для вашего реестра и отправьте.

**Замените `your-registry` на ваше имя пользователя или организацию в реестре Docker.**

```bash
docker build -t your-registry/webrtc-backend:latest -f backend/Dockerfile .
docker push your-registry/webrtc-backend:latest
```

#### Шаг 3: Сборка и отправка образа Nginx
Теперь соберите образ Nginx, который включает фронтенд-ресурсы и новую конфигурацию.

```bash
docker build -t your-registry/webrtc-nginx:latest -f Dockerfile .
docker push your-registry/webrtc-nginx:latest
```

---

### Часть 3: Развертывание на сервере

#### Шаг 1: Подготовка сервера
1.  **Установите Docker и Docker Compose** на вашем сервере.
2.  **Направьте DNS A-запись вашего домена** (например, `webrtc.yourdomain.com`) на IP-адрес вашего сервера.
3.  **Убедитесь, что порты `80` и `443` открыты** в брандмауэре вашего сервера.

#### Шаг 2: Получение SSL-сертификатов
Используйте Certbot для получения бесплатного SSL-сертификата от Let's Encrypt.
```bash
sudo apt update
sudo apt install certbot
sudo certbot certonly --standalone -d webrtc.yourdomain.com
```
Это создаст сертификаты в `/etc/letsencrypt/live/webrtc.yourdomain.com/`.

#### Шаг 3: Копирование файлов на сервер
Вам нужны только два файла на вашем сервере: `docker-compose.prod.yml` и `.env`.

Создайте каталог для вашего приложения на сервере:
```bash
mkdir -p /opt/webrtc-app
cd /opt/webrtc-app
```
Теперь скопируйте файлы `docker-compose.prod.yml` и `.env` в этот каталог. **Обязательно замените имена образов-заполнителей в `docker-compose.prod.yml` на ваши фактические имена образов.**

#### Шаг 4: Запуск приложения
Войдите в свой реестр Docker на сервере:
```bash
docker login your-registry
```
Затем извлеките образы и запустите службы, используя `docker-compose.prod.yml`:
```bash
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```
Ваше приложение теперь доступно по адресу `https://webrtc.yourdomain.com`.

---

### Локальная разработка
Для локальной разработки вы по-прежнему можете использовать оригинальный файл `docker-compose.yml`. Этот файл использует локальный код и включает горячую перезагрузку для более быстрой разработки.
```bash
# Для запуска среды локальной разработки
docker-compose up --build -d

# Для остановки
docker-compose down
```