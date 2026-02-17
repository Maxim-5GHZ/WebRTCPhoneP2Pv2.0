# WebRTCPhoneP2Pv2.0

Вторая версия P2P телефона Savely на Java Spring & React.ts, по аналогии с Zoom.

## Технологический стек

- **Бэкенд:** Java 21, Spring Boot, Spring Security, WebSocket, JPA (Hibernate), MariaDB
- **Фронтенд:** React.ts, Vite
- **База данных:** MariaDB (запускается в Docker)
- **Сборка:** Maven (для бэкенда), npm (для фронтенда)

---

## Режим разработки

### Необходимые компоненты

- **Java JDK 21**
- **Maven**
- **Node.js** (включая npm)
- **Docker** и **Docker Compose**

### Инструкция по установке и запуску

#### 1. Клонирование репозитория
```bash
git clone https://github.com/ваш-репозиторий/WebRTCPhoneP2Pv2.0.git
cd WebRTCPhoneP2Pv2.0
```

#### 2. Настройка и запуск базы данных (MariaDB)
1.  Перейдите в директорию `mariadb-docker`:
    ```bash
    cd mariadb-docker
    ```
2.  Создайте файл `.env` и добавьте в него переменные (замените значения на свои):
    ```env
    MARIADB_ROOT_PASSWORD=your_root_password
    MARIADB_DATABASE=webrtc_phone
    MARIADB_USER=user
    MARIADB_PASSWORD=password
    ```
3.  Запустите контейнер:
    ```bash
    docker-compose up -d
    ```

#### 3. Настройка и запуск бэкенда
1.  Перейдите в директорию `backend`: `cd ../backend`
2.  Создайте файл `.env` с данными для подключения к БД:
    ```env
    MARIADB_DATABASE=webrtc_phone
    MARIADB_USER=user
    MARIADB_PASSWORD=password
    ```
3.  Запустите Spring Boot приложение:
    ```bash
    ./mvnw spring-boot:run
    ```
    Сервер запустится на `http://localhost:8080`.

#### 4. Настройка и запуск фронтенда
1.  В новом терминале перейдите в директорию `frontend`: `cd frontend`
2.  Установите зависимости: `npm install`
3.  Запустите dev-сервер: `npm run dev`
    
Приложение для разработки будет доступно на `http://localhost:5173`.

---

## Режим развертывания (Production)

Этот режим позволяет собрать фронтенд и встроить его в бэкенд, чтобы получить единый `.jar` файл для запуска на сервере.

### Необходимые компоненты на сервере
- **Java JRE 21** (или новее)
- **Docker** и **Docker Compose** (для базы данных)

### Инструкция по сборке и развертыванию

#### 1. Сборка фронтенда
На вашей локальной машине (или на сборочном сервере) выполните команды в директории `frontend`:
```bash
cd frontend
npm install
npm run build
```
Это создаст директорию `dist` с готовыми файлами фронтенда.

#### 2. Копирование файлов фронтенда в бэкенд
Скопируйте содержимое `frontend/dist` в директорию статических ресурсов Spring Boot:
```bash
# Очистим директорию static на случай, если там были старые файлы
rm -rf ../backend/src/main/resources/static/*

# Скопируем новые файлы
cp -r ./dist/* ../backend/src/main/resources/static/
```

#### 3. Сборка бэкенда
Перейдите в директорию `backend` и соберите проект в `.jar` файл:
```bash
cd ../backend
./mvnw clean package
```
Готовый файл будет находиться в `backend/target/demo-0.0.1-SNAPSHOT.jar`.

#### 4. Развертывание на сервере
1.  **База данных:** Настройте и запустите MariaDB на сервере так же, как в режиме разработки (через Docker Compose).
2.  **Копирование артефакта:** Скопируйте `.jar` файл (`demo-0.0.1-SNAPSHOT.jar`) и ваш `.env` файл для бэкенда на сервер.
3.  **Запуск приложения:** Поместите `.env` файл рядом с `.jar` файлом и запустите приложение:
    ```bash
    java -jar demo-0.0.1-SNAPSHOT.jar
    ```
Теперь ваше приложение полностью работает и доступно на порту `8080` вашего сервера. Весь фронтенд будет отдаваться бэкендом.
