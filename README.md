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

## Инструкция по развертыванию

Проект полностью контейнеризован. Для запуска требуется Docker и Docker Compose.

#### 1. Клонирование репозитория
```bash
git clone https://github.com/ваш-репозиторий/WebRTCPhoneP2Pv2.0.git
cd WebRTCPhoneP2Pv2.0
```

#### 2. Файл с переменными окружения
В корне проекта находится файл `.env`. Убедитесь, что он содержит необходимые переменные для базы данных:
```env
MARIADB_ROOT_PASSWORD=your_root_password
MARIADB_DATABASE=your_database
MARIADB_USER=your_user
MARIADB_PASSWORD=your_password
```
При необходимости измените значения. Эти учетные данные будут использованы для создания базы данных и подключения к ней из бэкенда.

#### 3. Сборка фронтенда
Перед запуском Docker-контейнеров необходимо собрать статичные файлы фронтенда. Nginx будет раздавать их.
```bash
cd frontend
npm install
npm run build
cd ..
```
Эта команда создаст директорию `dist` в папке `frontend`.

#### 4. Запуск приложения
Теперь можно запустить все сервисы (nginx, backend, mariadb) с помощью одной команды из корня проекта:
```bash
docker-compose up --build -d
```
- `--build`: эта опция пересобирает образ бэкенда, если в его коде были изменения.
- `-d`: запускает контейнеры в фоновом режиме.

После выполнения команды приложение будет доступно в вашем браузере по адресу `http://localhost`.

- Фронтенд будет доступен по `/`.
- Запросы к API (`/api/*`) и WebSocket (`/signal`) будут автоматически проксироваться на бэкенд.

#### Остановка приложения
Чтобы остановить все запущенные контейнеры, выполните команду:
```bash
docker-compose down
```

---
## Режим разработки (опционально)

Если вы планируете активно разрабатывать фронтенд или бэкенд, вы можете запускать сервисы локально для более быстрой и удобной разработки.

1.  **База данных:** Запустите только базу данных из основного `docker-compose.yml`:
    ```bash
    docker-compose up -d mariadb
    ```
2.  **Бэкенд:** Откройте проект в вашей IDE (например, IntelliJ IDEA) и запустите его. Убедитесь, что в `backend/src/main/resources/application.properties` хост базы данных изменен на `localhost`, если вы запускаете бэкенд локально, а не в докере. Или настройте IDE для использования переменных окружения из `.env` файла.
    ```properties
    # backend/src/main/resources/application.properties
    spring.datasource.url=jdbc:mariadb://localhost:3306/${MARIADB_DATABASE}
    ```
3.  **Фронтенд:** Запустите dev-сервер Vite:
    ```bash
    cd frontend
    npm install
    npm run dev
    ```
    Фронтенд будет доступен на `http://localhost:5173` с горячей перезагрузкой. В этом режиме вам может потребоваться настроить прокси в `vite.config.ts` для запросов к локально запущенному бэкенду.
