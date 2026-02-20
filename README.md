# WebRTCPhoneP2Pv2.0

Вторая версия P2P телефона Savely на Java Spring & React.ts, по аналогии с Zoom.

## Технологический стек

- **Бэкенд:** Java 21, Spring Boot, Spring Security, WebSocket, JPA (Hibernate)
- **Фронтенд:** React.ts, Vite
- **База данных:** MariaDB
- **Контейнеризация:** Docker, Docker Compose

---

## Системные требования

- **Docker**
- **Docker Compose**
- **Node.js & npm** (для сборки фронтенда)
- **Git**

---

## Production Deployment (Registry-based)

This is the recommended method for deploying the application to a production server. It ensures that no source code or build tools are needed on the server itself. The workflow consists of building Docker images locally, pushing them to a Docker registry, and then pulling and running them on the server.

### Prerequisites
- **Local Machine**: Docker, Docker Compose, Node.js & npm, Git.
- **Server**: Docker, Docker Compose.
- **Docker Registry**: Access to a Docker registry (e.g., Docker Hub, GitHub Container Registry, GitLab Container Registry). You need to be logged into your registry.

---

### Part 1: Configuration

#### 1. Nginx for HTTPS
For a production deployment, you must use HTTPS. Update `nginx-docker/conf.d/default.conf` to handle SSL and redirect HTTP traffic.

**Replace `webrtc.yourdomain.com` with your actual domain.**

```nginx
# nginx-docker/conf.d/default.conf

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name webrtc.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name webrtc.yourdomain.com;

    # Paths to SSL certificates inside the container
    ssl_certificate /etc/ssl/certs/fullchain.pem;
    ssl_certificate_key /etc/ssl/private/privkey.pem;

    # SSL hardening
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256';
    ssl_prefer_server_ciphers off;
    
    # Caching for static assets (JS, CSS)
    # Vite adds a content hash to these filenames, so they can be cached for a long time.
    location ~* \.(?:css|js)$ {
        root /usr/share/nginx/dist;
        try_files $uri =404;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Main location for the Single Page Application
    location / {
        root   /usr/share/nginx/dist;
        index  index.html;
        try_files $uri $uri/ /index.html;
    }

    # Proxy for API requests
    location /api/ {
         proxy_pass http://backend:8080/api/;
         proxy_set_header Host $host;
         proxy_set_header X-Real-IP $remote_addr;
         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
         proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Proxy for WebSocket connections
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

#### 2. Environment Variables
Create a `.env` file in the root of the project. This will be used for both local development and on the production server.
```env
MARIADB_ROOT_PASSWORD=your_strong_root_password
MARIADB_DATABASE=webrtc_db
MARIADB_USER=webrtc_user
MARIADB_PASSWORD=your_strong_user_password
```

---

### Part 2: Build and Push Images (Local Machine)

#### Step 1: Build Frontend Assets
First, create the static files for the frontend.
```bash
cd frontend
npm install
npm run build
cd ..
```
This creates a `dist` directory inside the `frontend` folder, which is required for building the Nginx image.

#### Step 2: Build and Push Backend Image
Build the backend image, tag it for your registry, and push it.

**Replace `your-registry` with your Docker registry username or organization.**

```bash
docker build -t your-registry/webrtc-backend:latest -f backend/Dockerfile .
docker push your-registry/webrtc-backend:latest
```

#### Step 3: Build and Push Nginx Image
Now, build the Nginx image which includes the frontend assets and the new configuration.

```bash
docker build -t your-registry/webrtc-nginx:latest -f Dockerfile .
docker push your-registry/webrtc-nginx:latest
```

---

### Part 3: Deploy on Server

#### Step 1: Server Preparation
1.  **Install Docker and Docker Compose** on your server.
2.  **Point your domain's DNS** A record (e.g., `webrtc.yourdomain.com`) to your server's IP address.
3.  **Ensure ports `80` and `443` are open** in your server's firewall.

#### Step 2: Obtain SSL Certificates
Use Certbot to get a free SSL certificate from Let's Encrypt.
```bash
sudo apt update
sudo apt install certbot
sudo certbot certonly --standalone -d webrtc.yourdomain.com
```
This will create certificates in `/etc/letsencrypt/live/webrtc.yourdomain.com/`.

#### Step 3: Copy Files to Server
You only need two files on your server: `docker-compose.prod.yml` and `.env`.

Create a directory for your app on the server:
```bash
mkdir -p /opt/webrtc-app
cd /opt/webrtc-app
```
Now, copy the `docker-compose.prod.yml` and `.env` files into this directory. **Make sure to replace the placeholder image names in `docker-compose.prod.yml` with your actual image names.**

#### Step 4: Run the Application
Log in to your Docker registry on the server:
```bash
docker login your-registry
```
Then, pull the images and start the services using `docker-compose.prod.yml`:
```bash
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```
Your application is now live at `https://webrtc.yourdomain.com`.

---

### Local Development
For local development, you can still use the original `docker-compose.yml` file. This file uses local code and enables hot-reloading for faster development.
```bash
# To start local development environment
docker-compose up --build -d

# To stop it
docker-compose down
```

