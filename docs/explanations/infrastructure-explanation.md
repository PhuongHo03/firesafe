# 🐳 docker-compose.dev.yml — Giải thích Infrastructure

> File này dùng cho **môi trường phát triển local (development)**. Nó chỉ khởi động các service infrastructure (DB, cache, queue, storage) trong Docker. Spring Boot vẫn chạy trực tiếp trên máy host để tiện debug và hot-reload.

---

## 🚀 Cách sử dụng

### Runtime manager local

Chạy từ project root.

Windows:

```powershell
.\setup.ps1 up
.\setup.ps1 down
.\setup.ps1 clean
```

Linux:

```bash
./setup.sh up
./setup.sh down
./setup.sh clean
```

| Command | Hành động |
|---|---|
| `up` | Tạo `.runtime/`, kiểm tra dependency, tự chuẩn bị JDK 21/frontend deps/AI Worker venv khi cần, ghi `frontend/.env.local`, start Docker infra, backend, frontend, AI Worker |
| `down` | Dừng AI Worker/frontend/backend bằng PID file có metadata kiểm chứng, `docker compose down`, xóa `.runtime/`; giữ deps/build cache |
| `clean` | Làm toàn bộ việc của `down`, `docker compose down -v --remove-orphans`, xóa thêm generated artifacts local |

`setup.ps1` dùng PowerShell/Windows paths; `setup.sh` dùng Bash/Linux paths nhưng giữ cùng command, port keys, log layout và cleanup scope.

Runtime metadata/logs được ghi vào (`docker.log` đợi infra running/healthy rồi mới ghi Docker Compose status và logs):

```text
.runtime/ports.env
.runtime/logs/docker.log
.runtime/logs/backend.log
.runtime/logs/frontend.log
.runtime/logs/ai-worker.log
```

`ports.env` chứa port host của backend, frontend, AI Worker, MariaDB, Redis, RabbitMQ, MinIO, Adminer, RedisInsight. `up` ưu tiên port mặc định cho backend/frontend/AI Worker. Các port infra được cấp từ dải `7001+` theo thứ tự Adminer, MinIO Console, RedisInsight, RabbitMQ UI, MariaDB, MinIO API, Redis, RabbitMQ; nếu port bận, script tự tăng dần tới port trống tiếp theo và truyền vào Docker Compose/backend/frontend/AI Worker.

Trước khi start, `up` kiểm tra Docker, Node/npm và Python đã có trên máy. Nếu thiếu các công cụ hệ thống này, script dừng và in hướng dẫn cài đặt. Với Java, script ưu tiên `jdk-21.0.3+9` trong project; nếu chưa có Java 21 trong PATH thì tự tải JDK 21 về project. Nếu `frontend/node_modules` chưa tồn tại, script tự chạy `npm install` trong `frontend/`. AI Worker tự tạo `ai-worker/venv` và cài `requirements.txt` khi start. Sau khi chọn port, script ghi `frontend/.env.local` với `NEXT_PUBLIC_API_URL` và `NEXT_PUBLIC_AI_WORKER_URL` khớp port backend/AI Worker hiện tại.

`down` xóa runtime artifacts gồm ports/logs/PID trong `.runtime/`, nhưng giữ `ai-worker/venv/`, `frontend/node_modules/`, `frontend/.next/`, `backend/target/` và local JDK để lần sau khởi động nhanh. Host-process chỉ bị dừng khi PID file khớp metadata process do chính `setup.ps1` start trong đúng thư mục service; script không kill theo port để tránh dừng nhầm process của dự án khác. `clean` là chế độ aggressive trong phạm vi project: xóa container, volume và orphan thuộc compose project này, không xóa Docker image dùng chung, xóa `.runtime/`, rồi xóa thêm `ai-worker/venv/`, `frontend/node_modules/`, `frontend/.next/`, `backend/target/`, `jdk-21.0.3+9/`.

### Docker infra thủ công

```bash
# Khởi động tất cả service ở background
docker compose -f docker-compose.dev.yml up -d

# Kiểm tra trạng thái các service
docker compose -f docker-compose.dev.yml ps

# Xem log của một service cụ thể
docker compose -f docker-compose.dev.yml logs -f rabbitmq

# Dừng tất cả (giữ nguyên data)
docker compose -f docker-compose.dev.yml stop

# Dừng và xóa container (giữ nguyên volume/data)
docker compose -f docker-compose.dev.yml down

# Dừng và xóa cả data (reset hoàn toàn)
docker compose -f docker-compose.dev.yml down -v
```

Sau khi chạy `up -d`, có thể khởi động Spring Boot thủ công bằng:
```bash
cd backend
./mvnw spring-boot:run        # Linux/Mac
.\mvnw.cmd spring-boot:run    # Windows
```

---

## 📦 Các Service

Các port trong bảng dưới là default khi chạy Docker Compose thủ công. Khi chạy bằng runtime manager `up`, port host được lấy từ `.runtime/ports.env`.

### 1. `mariadb` — Database chính

| Thuộc tính | Giá trị |
|---|---|
| Image | `mariadb:11.4` |
| Container | `firesafe-mariadb` |
| Port | Runtime `MARIADB_PORT` → container `3306` (manual default `3306`) |
| Database | `firesafe` |
| Username | `firesafe` |
| Password | `firesafe` |
| Root password | `root` |

**Vai trò:** Lưu trữ toàn bộ dữ liệu chính của hệ thống: cameras, alerts, users, roles.

**Volume:** `mariadb_data` — data được lưu persistent vào Docker volume, không mất khi restart container.

**Healthcheck:** Kiểm tra MariaDB đã sẵn sàng nhận connection và InnoDB đã khởi tạo xong. Spring Boot sẽ không kết nối được nếu healthcheck chưa pass.

**UI:** Truy cập qua **Adminer** (đã có trong compose) tại `http://localhost:<ADMINER_PORT>`.
Hoặc dùng database client bên ngoài qua `localhost:<MARIADB_PORT>`: DBeaver, HeidiSQL, TablePlus, mysql CLI.

**Kết nối từ Spring Boot** (trong `application.yml`):
```yaml
spring.datasource.url: jdbc:mariadb://localhost:<MARIADB_PORT>/firesafe
spring.datasource.username: firesafe
spring.datasource.password: firesafe
```

---

### 2. `redis` — Cache / Debounce

| Thuộc tính | Giá trị |
|---|---|
| Image | `redis:7.4-alpine` |
| Container | `firesafe-redis` |
| Port | Runtime `REDIS_PORT` → container `6379` (manual default `6379`) |
| Auth | Không (dev mode) |

**Vai trò:** Lưu trữ key debounce để chống spam alert. Khi AI Worker gửi alert từ một camera, Spring Boot set key `alert:debounce:{camera_id}` với TTL 5 phút vào Redis. Nếu key còn tồn tại, các alert tiếp theo từ camera đó sẽ không gửi notification.

**Alpine image:** Dùng bản `alpine` (nhẹ hơn ~70%) vì đây là dev environment, không cần tính năng đầy đủ.

**Không có volume:** Redis trong dev không cần persist data — nếu container restart, key debounce mất đi là chấp nhận được.

**UI:** Truy cập qua **RedisInsight** (đã có trong compose) tại `http://localhost:<REDISINSIGHT_PORT>`.
Hoặc dùng redis-cli trực tiếp trong container:
```bash
docker exec -it firesafe-redis redis-cli
KEYS alert:debounce:*
TTL alert:debounce:1
```

**Kết nối từ Spring Boot**:
```yaml
spring.data.redis.host: localhost
spring.data.redis.port: <REDIS_PORT>
```

---

### 3. `rabbitmq` — Message Broker

| Thuộc tính | Giá trị |
|---|---|
| Image | `rabbitmq:3.13-management-alpine` |
| Container | `firesafe-rabbitmq` |
| Port AMQP | Runtime `RABBITMQ_PORT` → container `5672` (manual default `5672`) |
| Port Management UI | Runtime `RABBITMQ_UI_PORT` → container `15672` (manual default `15672`) |
| Username | `guest` |
| Password | `guest` |

**Vai trò:** Nhận message từ Spring Boot (`AlertService`) và chuyển đến `NotificationWorker` để gửi Telegram khi notification được bật. Việc dùng queue đảm bảo:
- Nếu Telegram API tạm lỗi/rate limit, worker có thể retry mà không chặn request alert
- `AlertService` trả response ngay cho AI Worker, không phải chờ notification gửi xong

**Management UI:** Truy cập `http://localhost:<RABBITMQ_UI_PORT>` (`guest/guest`) để xem topology Exchange/Queue, số message đang chờ, consumer status.

**`management-alpine` image:** Bản có sẵn giao diện web quản lý, tiện cho dev.

**Kết nối từ Spring Boot**:
```yaml
spring.rabbitmq.host: localhost
spring.rabbitmq.port: <RABBITMQ_PORT>
spring.rabbitmq.username: guest
spring.rabbitmq.password: guest
```

---

### 4. `minio` — Object Storage (lưu ảnh snapshot)

| Thuộc tính | Giá trị |
|---|---|
| Image | `minio/minio:latest` |
| Container | `firesafe-minio` |
| Port API | Runtime `MINIO_API_PORT` → container `9000` (manual default `9000`) |
| Port Console UI | Runtime `MINIO_CONSOLE_PORT` → container `9001` (manual default `9001`) |
| Root User | `minioadmin` |
| Root Password | `minioadmin` |

**Vai trò:** Lưu trữ ảnh snapshot khi AI Worker phát hiện lửa/khói. MinIO tương thích hoàn toàn với API của AWS S3 — code Java dùng AWS S3 SDK nhưng trỏ vào MinIO thay vì cloud.

**Luồng ảnh:**
```
AI Worker phát hiện lửa
    → Crop frame → Upload ảnh lên MinIO (port MINIO_API_PORT)
    → Nhận lại URL: http://localhost:<MINIO_API_PORT>/snapshots/cam-001/...
    → Gửi URL này kèm theo payload POST /api/v1/alerts
    → Spring Boot lưu URL vào cột image_url trong bảng alerts
```

**Console UI:** Truy cập `http://localhost:<MINIO_CONSOLE_PORT>` để quản lý bucket, xem/tải file ảnh. Dùng `minioadmin/minioadmin`.

**Lệnh khởi động container:** `server /data --console-address ":9001"` — chạy MinIO server lưu data vào `/data` và mở console trên port 9001.

**Volume:** `minio_data` — ảnh snapshot được lưu persistent, không mất khi restart.

**Kết nối từ Spring Boot** (trong `application.yml`):
```yaml
minio.endpoint: http://localhost:<MINIO_API_PORT>
minio.access-key: minioadmin
minio.secret-key: minioadmin
minio.bucket: snapshots
```

---

## 🔧 Dev Tool Services

### 5. `adminer` — Web UI cho MariaDB

| Thuộc tính | Giá trị |
|---|---|
| Image | `adminer:4.8.1` |
| Container | `firesafe-adminer` |
| Port | Runtime `ADMINER_PORT` → container `8080` (manual default `8081`) |
| UI | `http://localhost:<ADMINER_PORT>` |

**Cách kết nối:**
1. Mở `http://localhost:<ADMINER_PORT>`
2. Chọn **System:** `MySQL`
3. **Server:** `firesafe-mariadb` *(tên container — đã được điền sẵn qua `ADMINER_DEFAULT_SERVER`)*
4. **Username:** `firesafe` | **Password:** `firesafe` | **Database:** `firesafe`
5. Click **Login**



`depends_on: mariadb (service_healthy)` — Adminer chỉ start sau khi MariaDB healthy.

---

### 6. `redisinsight` — Web UI cho Redis

| Thuộc tính | Giá trị |
|---|---|
| Image | `redis/redisinsight:latest` |
| Container | `firesafe-redisinsight` |
| Port | Runtime `REDISINSIGHT_PORT` → container `5540` (manual default `5540`) |
| UI | `http://localhost:<REDISINSIGHT_PORT>` |

**Cách kết nối:**
1. Mở `http://localhost:<REDISINSIGHT_PORT>`
2. Click **Add Redis Database**
3. **Host:** `firesafe-redis` | **Port:** `6379`
4. Click **Add Redis Database**

**Xem key debounce trong RedisInsight:** Vào **Browser** → tìm key `alert:debounce:*` → xem TTL còn lại.

**Volume:** `redisinsight_data` — lưu cấu hình connection để không phải nhập lại sau mỗi restart.

---

## 🗂️ Volumes

```yaml
volumes:
  mariadb_data:       # Lưu data MariaDB
  minio_data:         # Lưu ảnh snapshot MinIO
  redisinsight_data:  # Lưu config kết nối RedisInsight
```

Data tồn tại ngay cả khi container bị xóa, chỉ mất khi chạy `docker compose down -v`.

---

## 🔍 Tại sao không có Backend/Frontend/AI Worker trong file này?

File này cố tình **chỉ** bao gồm infrastructure Docker. Backend, Frontend và AI Worker chạy trực tiếp trên host qua runtime manager vì:

1. **Hot-reload:** Khi dev, bạn liên tục sửa code. Chạy Spring Boot/Next.js trên host cho phép reload nhanh, còn trong Docker phải rebuild image nhiều hơn.
2. **Debug:** Attach debugger/log vào process host dễ hơn remote debug trong container.
3. **Runtime linh hoạt:** `setup.ps1`/`setup.sh` quản lý backend/frontend/AI Worker bằng PID files, port động và log riêng; Docker Compose chỉ giữ DB/cache/queue/storage/dev UI.

File `docker-compose.yml` production sau này sẽ bao gồm toàn bộ service: Nginx, Frontend, Backend, AI Worker và infrastructure.

---

## 📊 Tóm tắt nhanh

| Service | Port mặc định | UI mặc định | Mục đích |
|---|---|---|---|
| MariaDB | `3306` / runtime `MARIADB_PORT` | Adminer | Database chính |
| Redis | `6379` / runtime `REDIS_PORT` | RedisInsight | Debounce alert (cache TTL) |
| RabbitMQ | `5672` / runtime `RABBITMQ_PORT` | `RABBITMQ_UI_PORT` (`guest/guest`) | Message queue async notification |
| MinIO | `9000` / runtime `MINIO_API_PORT` | `MINIO_CONSOLE_PORT` (`minioadmin/minioadmin`) | Lưu ảnh snapshot |
| Adminer | `8081` / runtime `ADMINER_PORT` | `http://localhost:<ADMINER_PORT>` | Web UI quản lý MariaDB |
| RedisInsight | `5540` / runtime `REDISINSIGHT_PORT` | `http://localhost:<REDISINSIGHT_PORT>` | Web UI quản lý Redis |

Port thực tế luôn ưu tiên xem trong `.runtime/ports.env` sau khi chạy runtime manager `up`.

---

*Tài liệu phản ánh trạng thái `docker-compose.dev.yml`, `setup.ps1` và `setup.sh` tại **Giai đoạn 6**. Infrastructure dev chạy bằng Docker Compose; backend/frontend/AI Worker chạy trên host qua runtime manager. File `docker-compose.yml` production sẽ bổ sung ở Giai đoạn 8.*
