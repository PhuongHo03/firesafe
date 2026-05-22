# 🐳 docker-compose.dev.yml — Giải thích Infrastructure

> File này dùng cho **môi trường phát triển local (development)**. Nó chỉ khởi động các service infrastructure (DB, cache, queue, storage) trong Docker. Spring Boot vẫn chạy trực tiếp trên máy host để tiện debug và hot-reload.

---

## 🚀 Cách sử dụng

### Runtime manager trên Windows

Chạy từ project root:

```powershell
.\setup.ps1 up
.\setup.ps1 down
.\setup.ps1 clean
```

| Command | Hành động |
|---|---|
| `up` | Tạo `.runtime/`, start Docker infra, backend, frontend, AI Worker |
| `down` | Dừng AI Worker/backend/frontend bằng PID file, `docker compose down`, xóa `.runtime/` |
| `clean` | Dừng runtime, `docker compose down -v --rmi all --remove-orphans`, xóa `.runtime/` |

Runtime metadata/logs được ghi vào:

```text
.runtime/ports.env
.runtime/logs/docker.log
.runtime/logs/backend.log
.runtime/logs/backend.err.log
.runtime/logs/frontend.log
.runtime/logs/frontend.err.log
.runtime/logs/ai-worker.log
.runtime/logs/ai-worker.err.log
```

`ports.env` chứa port host của backend, frontend, AI Worker, MariaDB, Redis, RabbitMQ, MinIO, Adminer, RedisInsight. `up` ưu tiên port mặc định; nếu port bận trước khi start, script tự chọn port trống tiếp theo và truyền vào Docker Compose/backend/frontend/AI Worker.

`down` xóa toàn bộ runtime artifacts gồm ports và logs. `clean` là chế độ aggressive: xóa container, image, volume thuộc compose project này rồi xóa `.runtime/`.

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

### 1. `mariadb` — Database chính

| Thuộc tính | Giá trị |
|---|---|
| Image | `mariadb:11.4` |
| Container | `firesafe-mariadb` |
| Port | `3306:3306` |
| Database | `firesafe` |
| Username | `firesafe` |
| Password | `firesafe` |
| Root password | `root` |

**Vai trò:** Lưu trữ toàn bộ dữ liệu chính của hệ thống: cameras, alerts, users, roles.

**Volume:** `mariadb_data` — data được lưu persistent vào Docker volume, không mất khi restart container.

**Healthcheck:** Kiểm tra MariaDB đã sẵn sàng nhận connection và InnoDB đã khởi tạo xong. Spring Boot sẽ không kết nối được nếu healthcheck chưa pass.

**UI:** Truy cập qua **Adminer** (đã có trong compose) tại `http://localhost:8081`.
Hoặc dùng database client bên ngoài qua port `3306`: DBeaver, HeidiSQL, TablePlus, mysql CLI.

**Kết nối từ Spring Boot** (trong `application.yml`):
```yaml
spring.datasource.url: jdbc:mariadb://localhost:3306/firesafe
spring.datasource.username: firesafe
spring.datasource.password: firesafe
```

---

### 2. `redis` — Cache / Debounce

| Thuộc tính | Giá trị |
|---|---|
| Image | `redis:7.4-alpine` |
| Container | `firesafe-redis` |
| Port | `6379:6379` |
| Auth | Không (dev mode) |

**Vai trò:** Lưu trữ key debounce để chống spam alert. Khi AI Worker gửi alert từ một camera, Spring Boot set key `alert:debounce:{camera_id}` với TTL 5 phút vào Redis. Nếu key còn tồn tại, các alert tiếp theo từ camera đó sẽ không gửi notification.

**Alpine image:** Dùng bản `alpine` (nhẹ hơn ~70%) vì đây là dev environment, không cần tính năng đầy đủ.

**Không có volume:** Redis trong dev không cần persist data — nếu container restart, key debounce mất đi là chấp nhận được.

**UI:** Truy cập qua **RedisInsight** (đã có trong compose) tại `http://localhost:5540`.
Hoặc dùng redis-cli trực tiếp trong container:
```bash
docker exec -it firesafe-redis redis-cli
KEYS alert:debounce:*
TTL alert:debounce:1
```

**Kết nối từ Spring Boot**:
```yaml
spring.data.redis.host: localhost
spring.data.redis.port: 6379
```

---

### 3. `rabbitmq` — Message Broker

| Thuộc tính | Giá trị |
|---|---|
| Image | `rabbitmq:3.13-management-alpine` |
| Container | `firesafe-rabbitmq` |
| Port AMQP | `5672:5672` |
| Port Management UI | `15672:15672` |
| Username | `guest` |
| Password | `guest` |

**Vai trò:** Nhận message từ Spring Boot (`AlertService`) và chuyển đến `NotificationWorker` để gửi Zalo ZNS / Telegram. Việc dùng queue đảm bảo:
- Nếu Zalo API down, message không mất — vẫn còn trong queue
- `AlertService` trả response ngay cho AI Worker, không phải chờ notification gửi xong

**Management UI:** Truy cập `http://localhost:15672` (`guest/guest`) để xem topology Exchange/Queue, số message đang chờ, consumer status.

**`management-alpine` image:** Bản có sẵn giao diện web quản lý, tiện cho dev.

**Kết nối từ Spring Boot**:
```yaml
spring.rabbitmq.host: localhost
spring.rabbitmq.port: 5672
spring.rabbitmq.username: guest
spring.rabbitmq.password: guest
```

---

### 4. `minio` — Object Storage (lưu ảnh snapshot)

| Thuộc tính | Giá trị |
|---|---|
| Image | `minio/minio:latest` |
| Container | `firesafe-minio` |
| Port API | `9000:9000` |
| Port Console UI | `9001:9001` |
| Root User | `minioadmin` |
| Root Password | `minioadmin` |

**Vai trò:** Lưu trữ ảnh snapshot khi AI Worker phát hiện lửa/khói. MinIO tương thích hoàn toàn với API của AWS S3 — code Java dùng AWS S3 SDK nhưng trỏ vào MinIO thay vì cloud.

**Luồng ảnh:**
```
AI Worker phát hiện lửa
    → Crop frame → Upload ảnh lên MinIO (port 9000)
    → Nhận lại URL: http://localhost:9000/snapshots/cam-001/...
    → Gửi URL này kèm theo payload POST /api/v1/alerts
    → Spring Boot lưu URL vào cột image_url trong bảng alerts
```

**Console UI:** Truy cập `http://localhost:9001` để quản lý bucket, xem/tải file ảnh. Dùng `minioadmin/minioadmin`.

**Lệnh khởi động container:** `server /data --console-address ":9001"` — chạy MinIO server lưu data vào `/data` và mở console trên port 9001.

**Volume:** `minio_data` — ảnh snapshot được lưu persistent, không mất khi restart.

**Kết nối từ Spring Boot** (trong `application.yml`):
```yaml
minio.endpoint: http://localhost:9000
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
| Port | `8081:8080` |
| UI | http://localhost:8081 |

**Cách kết nối:**
1. Mở `http://localhost:8081`
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
| Port | `5540:5540` |
| UI | http://localhost:5540 |

**Cách kết nối:**
1. Mở `http://localhost:5540`
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

## 🔍 Tại sao không có Spring Boot trong file này?

File này cố tình **không** bao gồm Spring Boot vì:

1. **Hot-reload:** Khi dev, bạn liên tục sửa code. Chạy Spring Boot trên máy host cho phép IDE tự reload, còn trong Docker phải rebuild image mỗi lần.
2. **Debug:** Attach debugger từ IntelliJ/VSCode vào process trên host dễ hơn nhiều so với remote debug vào container.
3. **Runtime linh hoạt:** `setup.ps1` quản lý backend/frontend bằng process host và PID files, còn Docker Compose chỉ giữ phần infra.

File `docker-compose.yml` (production, không có hậu tố `.dev`) sẽ bao gồm tất cả service kể cả Spring Boot, Next.js, Nginx.

---

## 📊 Tóm tắt nhanh

| Service | Port | UI | Mục đích |
|---|---|---|---|
| MariaDB | `3306` | ✅ http://localhost:8081 (Adminer) | Database chính |
| Redis | `6379` | ✅ http://localhost:5540 (RedisInsight) | Debounce alert (cache TTL) |
| RabbitMQ | `5672` | ✅ http://localhost:15672 (`guest/guest`) | Message queue async notification |
| MinIO | `9000` | ✅ http://localhost:9001 (`minioadmin/minioadmin`) | Lưu ảnh snapshot |
| Adminer | `8081` | ✅ http://localhost:8081 | Web UI quản lý MariaDB |
| RedisInsight | `5540` | ✅ http://localhost:5540 | Web UI quản lý Redis |

---

*Tài liệu phản ánh trạng thái `docker-compose.dev.yml` và `setup.ps1` tại **Giai đoạn 6**. Infrastructure dev chạy bằng Docker Compose; backend/frontend chạy trên host qua runtime manager. File `docker-compose.yml` production sẽ bổ sung ở Giai đoạn 8.*
