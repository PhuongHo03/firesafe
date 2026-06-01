# 📁 Backend — Cấu trúc Project

> Cây thư mục đầy đủ và chính xác của `backend/`, phản ánh trạng thái thực tế trên disk.

---

```
backend/
│
├── Dockerfile                       ← Build Spring Boot image cho Docker Compose
├── pom.xml                          ← Khai báo dependencies, build config (Maven)
├── mvnw / mvnw.cmd                  ← Maven Wrapper — chạy Maven không cần cài trên máy
│
└── src/
    │
    ├── main/
    │   │
    │   ├── java/com/firesafe/backend/
    │   │   │
    │   │   ├── BackendApplication.java              ← Entry point (hàm main)
    │   │   │
    │   │   ├── configs/                             ← Khai báo Bean & cấu hình Spring
    │   │   │   ├── PresetCameraSeeder.java          ← Seed camera RTSP từ process env/root `.env`
    │   │   │   ├── OpenApiConfig.java               ← Swagger UI + JWT Bearer scheme
    │   │   │   ├── RabbitMQConfig.java              ← Exchange, Queue, Binding, Converter
    │   │   │   └── SecurityConfig.java              ← Filter chain, role-based auth rules
    │   │   │
    │   │   ├── controllers/                         ← REST API — nhận request, trả response
    │   │   │   ├── AuthController.java              ← POST /api/v1/auth/login/register
    │   │   │   ├── AlertController.java             ← GET/POST/DELETE /api/v1/alerts
    │   │   │   ├── CameraController.java            ← CRUD /api/v1/cameras
    │   │   │   ├── MetricsExportController.java     ← GET /api/v1/metrics/export
    │   │   │   ├── MonitoringController.java        ← GET /api/v1/monitoring/summary
    │   │   │   └── UserController.java              ← ADMIN quản lý users
    │   │   │
    │   │   ├── dtos/                                ← Data Transfer Objects (API contract)
    │   │   │   ├── LoginRequest.java / LoginResponse.java
    │   │   │   ├── RegisterRequest.java / UpdateUserRequest.java / UserResponse.java
    │   │   │   ├── AlertRequest.java / AlertResponse.java
    │   │   │   ├── AlertReservationRequest.java / AlertReservationResponse.java
    │   │   │   ├── CameraRequest.java / CameraResponse.java
    │   │   │   └── MetricsExportResponse.java / MonitoringSummaryResponse.java
    │   │   │
    │   │   ├── models/                              ← ORM Model — ánh xạ Java class ↔ bảng DB
    │   │   │   ├── User.java                        ← Bảng users
    │   │   │   ├── Role.java                        ← Bảng roles
    │   │   │   ├── Camera.java                      ← Bảng cameras
    │   │   │   └── Alert.java                       ← Bảng alerts
    │   │   │
    │   │   ├── repositories/                        ← Data Access Layer — giao tiếp với DB
    │   │   │   ├── UserRepository.java              ← Tìm user theo username
    │   │   │   ├── RoleRepository.java              ← Tìm role hệ thống
    │   │   │   ├── CameraRepository.java            ← CRUD cameras
    │   │   │   └── AlertRepository.java             ← Lưu và query alerts có phân trang
    │   │   │
    │   │   ├── services/                            ← Business Logic + Spring Security user loader
    │   │   │   ├── AlertService.java                ← Lưu alert + Redis debounce + RabbitMQ publish
    │   │   │   ├── AuthService.java                 ← Login/register + JWT
    │   │   │   ├── CameraService.java               ← CRUD logic cho cameras
    │   │   │   ├── MetricsExportService.java        ← Tổng hợp metrics nhẹ cho Prometheus/dashboard
    │   │   │   ├── MonitoringService.java           ← Summary cũ cho dashboard
    │   │   │   ├── UserService.java                 ← ADMIN quản lý user/role
    │   │   │   ├── UserDetailsServiceImpl.java      ← Load user từ DB cho Spring Security
    │   │   │   ├── MinioService.java                ← Upload ảnh, tạo pre-signed URL
    │   │   │   ├── TelegramNotificationService.java ← Gọi Telegram Bot API
    │   │   │   └── NotificationWorker.java          ← RabbitMQ consumer + retry logic
    │   │   │
    │   │   ├── middlewares/                         ← Request middleware/filter
    │   │   │   └── JwtAuthFilter.java               ← Đọc Bearer token mỗi request
    │   │   │
    │   │   └── utils/                               ← Shared helpers + global error handling
    │   │       ├── JwtUtils.java                    ← Tạo token, parse token, validate
    │   │       └── GlobalExceptionHandler.java      ← Bắt exception → HTTP response chuẩn RFC 7807
    │   │
    │   └── resources/
    │       │
    │       ├── application.yml                      ← Cấu hình toàn bộ ứng dụng (DB, Redis, MQ, JWT)
    │       │
    │       └── db/
    │           └── migration/                       ← Flyway — tự chạy SQL khi app khởi động
    │               └── V1__init_schema.sql          ← Tạo 5 bảng + indexes + roles + admin user
    │
    └── test/
        └── java/com/firesafe/backend/
            └── BackendApplicationTests.java         ← Test khởi động context Spring Boot
```

---

## 📌 Lưu ý về cấu trúc

- **`mvnw` / `mvnw.cmd`** là Maven Wrapper scripts — cho phép build project mà không cần cài Maven trên máy. Chạy `./mvnw spring-boot:run` thay cho `mvn spring-boot:run`
- Các file `.gitattributes`, `.gitignore` ở root `backend/` là file sinh tự động bởi Spring Initializr — không ảnh hưởng đến logic ứng dụng


---

## 🚀 Cách chạy

### Docker Compose full stack — workflow chính Giai đoạn 8

Từ project root:

```powershell
Copy-Item .env.example .env
# chỉnh .env nếu cần
docker compose up --build -d
```

```bash
cp .env.example .env
# chỉnh .env nếu cần
docker compose up --build -d
```

Trong Docker Compose, backend chạy nội bộ tại `backend:8080` và **không publish trực tiếp ra host**. Browser/API client đi qua Nginx app entrypoint:

```text
http://localhost:<FRONTEND_PORT>/api/v1/...
http://localhost:<FRONTEND_PORT>/swagger-ui.html
http://localhost:<FRONTEND_PORT>/actuator/health
```

Mặc định `FRONTEND_PORT=3000`, nên Swagger qua Docker là:

```text
http://localhost:3000/swagger-ui.html
```

### Chạy thủ công backend từ source

Docker Compose là workflow chính. Nếu cần chạy backend host-process để debug, vẫn cần infra tương ứng đang chạy và truyền cấu hình qua process env:

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

```bash
cd backend
./mvnw spring-boot:run
```

Mặc định chạy tại:

```text
http://localhost:8080
```

---

## 🔧 Cấu hình

Backend đọc cấu hình từ process env. Trong Docker Compose, các biến này đến từ root `.env`.

Preset camera dev dùng:

```env
FIRESAFE_PRESET_CAMERA_RTSP_URL=rtsp://user:password@camera-host:554/stream
FIRESAFE_PRESET_CAMERA_NAME=Camera RTSP Preset
FIRESAFE_PRESET_CAMERA_LOCATION=Preset
```

Nếu `FIRESAFE_PRESET_CAMERA_RTSP_URL` rỗng, backend không seed camera preset. Không commit root `.env` nếu có credential thật.

---

## 🗺️ Luồng dữ liệu tổng quan

```
HTTP Request đến
    │
    ▼
[middlewares/JwtAuthFilter] → Kiểm tra token JWT trong header Authorization
    │
    ▼
[configs/SecurityConfig]    → Kiểm tra quyền truy cập (role có phù hợp không?)
    │
    ▼
[controllers]              → Nhận request, validate DTO, gọi Service
    │
    ▼
[services]                 → Xử lý logic nghiệp vụ (Redis, RabbitMQ, DB)
    │
    ▼
[repositories]             → Giao tiếp với MariaDB qua JPA/Hibernate
    │
    ▼
[models]                   → Ánh xạ Java object ↔ bảng database
    │
    ▼ (ngược lại)
[DTO Response]          → Định dạng dữ liệu trả về cho client
    │
    ▼
HTTP Response
```

---

## 📄 Giải thích chi tiết từng file

---

### ⚙️ `pom.xml` — Maven Build File

**Vai trò:** Tương đương `package.json` của Node.js. Maven đọc file này để tải về tất cả thư viện cần thiết và định nghĩa cách build, test, package ứng dụng.

| Dependency | Mục đích |
|---|---|
| `spring-boot-starter-web` | HTTP server (nhúng Tomcat), REST API |
| `spring-boot-starter-security` | Authentication & Authorization framework |
| `spring-boot-starter-data-jpa` | ORM — Hibernate mapping Java ↔ SQL |
| `spring-boot-starter-amqp` | Client giao tiếp với RabbitMQ |
| `spring-boot-starter-data-redis` | Client giao tiếp với Redis |
| `spring-boot-starter-actuator` | Health check, metrics endpoint |
| `spring-boot-starter-validation` | Validate input với `@NotBlank`, `@NotNull` |
| `flyway-core` + `flyway-mysql` | Tự động chạy SQL migration khi app khởi động |
| `mariadb-java-client` | JDBC driver để kết nối MariaDB |
| `jjwt-api/impl/jackson` | Tạo và parse JWT token |
| `springdoc-openapi-starter-webmvc-ui` | Tự động sinh Swagger UI từ code |
| `minio` | SDK để upload/download file từ MinIO |
| `micrometer-registry-prometheus` | Export metrics theo format Prometheus |
| `spring-boot-devtools` | Dev hot-reload khi chạy local |
| `lombok` | Tự sinh getter/setter/constructor — giảm boilerplate |
| `spring-boot-starter-test`, `spring-rabbit-test`, `spring-security-test` | Test Spring Boot/RabbitMQ/Security |

---

### 🚀 `BackendApplication.java` — Entry Point

**Vai trò:** Điểm khởi động của toàn bộ ứng dụng. Khi chạy `./mvnw spring-boot:run`, JVM gọi hàm `main()` trong file này.

`@SpringBootApplication` kích hoạt 3 thứ cùng lúc:
- **Auto-configuration:** Spring tự cấu hình DataSource, RabbitMQ, Redis dựa vào dependencies trong classpath
- **Component Scan:** Tự tìm và đăng ký tất cả `@Service`, `@Repository`, `@Controller`, `@Component`
- **Configuration:** Cho phép định nghĩa bean bằng `@Bean`

---

### 📋 `application.yml` — Cấu hình ứng dụng

**Vai trò:** File cấu hình trung tâm. Hỗ trợ override bằng biến môi trường — cùng một binary chạy được cả dev lẫn Docker:

```yaml
# Cú pháp: ${TEN_BIEN_MOI_TRUONG:gia_tri_mac_dinh}
spring.datasource.url: jdbc:mariadb://${DB_HOST:localhost}:${DB_PORT:3306}/${DB_NAME:firesafe}
# → Khi dev local/runtime manager: dùng localhost + port runtime
# → Khi chạy Docker: truyền DB_HOST=mariadb, DB_PORT=3306
```

| Section | Cấu hình |
|---|---|
| `spring.datasource` | Kết nối MariaDB |
| `spring.jpa` | Hibernate dialect, `ddl-auto=validate` (không tự sửa schema) |
| `spring.flyway` | Đường dẫn migration, tự chạy khi app start |
| `spring.data.redis` | Host và port Redis |
| `spring.rabbitmq` | Host, port, credentials RabbitMQ |
| `jwt.*` | Secret key và thời gian hết hạn token (24h) |
| `minio.*` | Endpoint, access key, bucket name |
| `alert.debounce-ttl-seconds` | Thời gian debounce alert (300s = 5 phút) |
| `management.endpoints` | Expose `/actuator/prometheus` cho Grafana |
| `springdoc.*` | Đường dẫn Swagger UI |
| `firesafe.preset-camera` | Camera RTSP preset đọc từ `FIRESAFE_PRESET_CAMERA_*` |
| `telegram.*` / `notification.retry.*` | Bật/tắt Telegram và cấu hình retry notification |


### 🗃️ `db/migration/` — Flyway Database Migrations

**Vai trò:** Thay thế chạy SQL tay. Mỗi lần ứng dụng khởi động, Flyway kiểm tra bảng `flyway_schema_history` trong DB và tự động chạy các file chưa được chạy theo đúng thứ tự version.

> **Quy tắc bắt buộc:** `V{số}__{mô_tả}.sql` — số tăng dần, **tuyệt đối không sửa file đã chạy** (Flyway sẽ báo lỗi checksum mismatch).

#### `V1__init_schema.sql`
Tạo toàn bộ 5 bảng và các index tối ưu query:

| Bảng | Mục đích |
|---|---|
| `roles` | Lưu 2 role: ROLE_ADMIN, ROLE_VIEWER |
| `users` | Tài khoản người dùng hệ thống |
| `user_roles` | Bảng trung gian many-to-many User ↔ Role |
| `cameras` | Thông tin camera IP (RTSP URL, vị trí lắp đặt) |
| `alerts` | Lịch sử sự kiện phát hiện lửa/khói |

#### `V1__init_schema.sql`
Tạo schema ban đầu, indexes, roles hệ thống và 1 admin user `admin@nhattienchung.vn` / `admin123` (BCrypt hashed), active sẵn để đăng nhập qua rule domain hiện tại.

---

### 🗄️ `models/` — ORM Model

**Vai trò:** Mỗi class ánh xạ trực tiếp với một bảng trong database. Hibernate đọc JPA annotation để sinh SQL tương ứng.

#### `Role.java` → bảng `roles`
Chứa tên role dạng chuỗi. Spring Security yêu cầu prefix `ROLE_`; hệ thống hiện chỉ dùng `ROLE_ADMIN` và `ROLE_VIEWER`.

#### `User.java` → bảng `users`
```java
@ManyToMany(fetch = FetchType.EAGER)  // Load roles cùng lúc với user
@JoinTable(name = "user_roles", ...)
private Set<Role> roles;
```
`EAGER` — cần thiết cho authentication: khi load User phải biết ngay roles của họ.

#### `Camera.java` → bảng `cameras`
Lưu RTSP URL, tên, vị trí. AI Worker dùng `camera_id` từ bảng này khi gửi alert.

#### `Alert.java` → bảng `alerts`
```java
@ManyToOne(fetch = FetchType.LAZY)   // Chỉ load Camera khi cần
@JoinColumn(name = "camera_id")
private Camera camera;
```
`LAZY` — tránh N+1 query: chỉ truy vấn Camera khi code gọi `alert.getCamera()`.

---

### 💾 `repositories/` — Data Access Layer

**Vai trò:** Interface giao tiếp với database. Spring Data JPA tự động sinh implementation, không cần viết SQL thủ công.

```java
// Spring tự dịch method name → SQL
Page<Alert> findByCameraIdOrderByDetectedAtDesc(Long cameraId, Pageable pageable);
// → SELECT * FROM alerts WHERE camera_id = ? ORDER BY detected_at DESC LIMIT ? OFFSET ?
```

| File | Vai trò chính |
|---|---|
| `UserRepository` | `findByUsername()` — dùng mỗi lần xác thực JWT token |
| `CameraRepository` | CRUD + `findByIsActiveTrue()` và `findByRtspUrl()` — lấy camera active và chống seed trùng preset |
| `AlertRepository` | Lưu alert + query phân trang (tránh load hàng nghìn record) |

---

### 📦 `dtos/` — Data Transfer Objects

**Vai trò:** Tách biệt dữ liệu API khỏi dữ liệu database.

**Tại sao không dùng Entity trực tiếp?**
- Entity `User` có field `passwordHash` — không được trả về client
- `AlertResponse` cần `cameraName` — phải join từ bảng khác, Entity không có sẵn
- Validation annotation (`@NotBlank`) nên nằm ở DTO, không phải Entity

| DTO | Hướng | Nội dung |
|---|---|---|
| `LoginRequest` | Client → Server | `{email, password}` |
| `LoginResponse` | Server → Client | `{token, username, email, roles[]}` |
| `RegisterRequest` | Client → Server | `{username, email, password}` — username là tên hiển thị UI |
| `AlertReservationRequest` | AI Worker → Server | Giữ slot Redis debounce trước khi upload snapshot |
| `AlertReservationResponse` | Server → AI Worker | `{reserved, reservationToken, ttlSeconds}` để quyết định có upload/tạo alert không |
| `AlertRequest` | AI Worker → Server | Payload tạo alert sau khi đã có `reservationToken` hợp lệ |
| `AlertResponse` | Server → Client | Alert kèm `cameraName` |
| `CameraRequest` | Client → Server | Tạo/cập nhật camera |
| `CameraResponse` | Server → Client | Thông tin camera (ẩn field internal) |

---

### ⚙️ `services/` — Business Logic

**Vai trò:** Xử lý logic nghiệp vụ. Controller không được chứa logic, chỉ gọi Service.

#### `AlertService.java` — Quan trọng nhất

Luồng khi AI Worker gửi một alert:
```
1. AI Worker gọi POST /api/v1/alerts/reservations với cameraId + label
2. Backend kiểm tra Redis key "alert:debounce:{camera_id}:{label}"
   ├── Key CHƯA tồn tại → SETNX reservation:{uuid} TTL 5 phút → trả reservationToken
   └── Key ĐÃ tồn tại → trả reserved=false, AI Worker bỏ qua upload/POST alert
3. AI Worker chỉ upload MinIO khi reserve thành công
4. AI Worker gọi POST /api/v1/alerts kèm reservationToken + imageUrl
5. Backend validate Redis value khớp reservationToken
6. Lưu Alert vào MariaDB, đổi Redis value thành alert:{alertId}, publish RabbitMQ sau commit
7. NotificationWorker consume RabbitMQ → Telegram nếu bật
```

Redis debounce giờ chặn cùng lúc MinIO/MariaDB/RabbitMQ/Telegram cho alert trùng cùng `cameraId + label` trong TTL. Direct `POST /api/v1/alerts` không có reservation token hợp lệ bị từ chối. Runtime dùng timezone `Asia/Ho_Chi_Minh`, nên `detectedAt`/`createdAt` lưu theo mốc giờ Việt Nam.

#### `CameraService.java`
CRUD đơn giản. Mỗi method có `@Transactional` đảm bảo atomicity khi ghi DB.

#### `MinioService.java` — Object Storage Client
- `@PostConstruct ensureBucketExists()` — tự tạo bucket `snapshots` khi app khởi động nếu chưa tồn tại
- `upload(objectName, inputStream, contentType, size)` → upload file + trả về pre-signed URL (7 ngày)
- `uploadMultipart(objectName, file)` → wrapper dùng cho REST endpoint upload trực tiếp
- `getPresignedUrl(objectName, hours)` → tạo URL có thời hạn cho object đã tồn tại

#### `TelegramNotificationService.java` — Telegram Bot API
- Có thể bật/tắt qua biến môi trường `TELEGRAM_ENABLED=true/false` (mặc định `false`)
- Khi `enabled=false` → chỉ log, không gọi API thật (an toàn cho dev)
- Gửi tin nhắn HTML có format rõ ràng: Camera, Label, Confidence%, Thời gian, Alert ID
- Ném `TelegramRateLimitException` khi HTTP 429 → Worker retry với backoff
- Ném `TelegramQuotaException` khi HTTP 403 → Worker KHÔNG retry, alert admin

#### `NotificationWorker.java` — RabbitMQ Consumer với Retry
```
Queue "alert.notification.queue"
    → processNotification(alertId)
    → Load Alert từ DB
    → sendWithRetry(alert)
         ├── TelegramRateLimitException (429)
         │     → sleep(delay) → retry (tối đa 3 lần)
         │     → delay tăng dần: 2s → 4s → 8s (exponential backoff)
         └── TelegramQuotaException (403)
               → KHÔNG retry → notifyAdmin() → log ERROR
```
Chạy **bất đồng bộ** — `AlertService` không cần chờ notification xong mới trả response.
Retry config đọc từ `application.yml`: `notification.retry.*`

---

### 🔒 JWT Authentication (`middlewares/`, `utils/`, `services/`)

#### `utils/JwtUtils.java`
- `generateToken()` → tạo JWT ký bằng HMAC-SHA256 với secret key
- `extractUsername()` → parse token → lấy username
- `validateToken()` → kiểm tra username khớp + chưa hết hạn

#### `middlewares/JwtAuthFilter.java`
Chạy **trước mọi request**:
```
1. Đọc header: Authorization: Bearer <token>
2. Parse token → lấy username
3. Load UserDetails từ DB
4. Validate token
5. Đưa Authentication vào SecurityContextHolder
```
Nếu token không hợp lệ → request tiếp tục nhưng không có Authentication → SecurityConfig reject 401.

#### `services/UserDetailsServiceImpl.java`
"Dạy" Spring Security cách load user từ MariaDB:
```java
loadUserByUsername("admin")
    → UserRepository.findByUsername("admin")
    → convert User model → Spring Security UserDetails
    → trả về: username, passwordHash, authorities (roles)
```

---

### 🌐 `controllers/` — REST API Layer

**Vai trò:** Nhận HTTP request, validate input, gọi Service, trả HTTP response. **Không chứa business logic.**

#### `AuthController` — auth endpoints

| Endpoint | Method | Mô tả |
|---|---|---|
| `/api/v1/auth/login` | POST | Đăng nhập bằng email `@nhattienchung.vn` + password, trả JWT |
| `/api/v1/auth/register` | POST | Đăng ký tài khoản viewer pending activation với tên hiển thị tự chọn + email `@nhattienchung.vn`; không trả JWT active |

Luồng login:
```text
LoginRequest(email,password) → AuthService.login()
             → enforce @nhattienchung.vn
             → AuthenticationManager.authenticate()
             → JwtUtils.generateToken()
             → LoginResponse {token, username, roles}
```

Luồng register:
```text
RegisterRequest(username,email,password)
  → trim username làm tên hiển thị UI
  → normalize email lower-case
  → enforce @nhattienchung.vn
  → reject duplicate email
  → reject duplicate username
  → encode password bằng BCrypt
  → assign ROLE_VIEWER
  → set isActive=false
  → Admin kích hoạt trong /api/v1/users trước khi user login được
```

#### `AlertController`

| Endpoint | Method | Mô tả |
|---|---|---|
| `/api/v1/alerts` | POST | AI Worker gửi alert mới |
| `/api/v1/alerts?cameraId=1&page=0` | GET | Danh sách alerts (filter + phân trang) |
| `/api/v1/alerts/{id}` | GET | Chi tiết một alert |
| `/api/v1/alerts` | DELETE | Xóa tất cả alert (ADMIN), cleanup MinIO snapshot và Redis debounce |
| `/api/v1/alerts/{id}` | DELETE | Xóa một alert (ADMIN), cleanup MinIO snapshot và Redis debounce nếu key còn trỏ tới alert đó |
| `/api/v1/monitoring/summary` | GET | Monitoring summary cũ cho Dashboard: backend status, alert totals/24h/high-confidence, camera total/active |
| `/api/v1/metrics/export` | GET | Export business metrics nhẹ cho dashboard/Prometheus migration: alert totals, hourly/byLabel, camera total/active |
| `/api/v1/users` | GET | ADMIN list users để kích hoạt/chỉnh role |
| `/api/v1/users/{id}` | PUT | ADMIN update `active` và role (`ROLE_ADMIN` hoặc `ROLE_VIEWER`) |

#### `CameraController`

| Endpoint | Method | Auth | Mô tả |
|---|---|---|---|
| `/api/v1/cameras` | GET | Mọi role | Danh sách cameras |
| `/api/v1/cameras/{id}` | GET | Mọi role | Chi tiết camera |
| `/api/v1/cameras` | POST | ADMIN | Thêm camera |
| `/api/v1/cameras/{id}` | PUT | ADMIN | Cập nhật camera |
| `/api/v1/cameras/{id}` | DELETE | ADMIN | Xóa camera |

---

### ⚙️ `configs/` — Spring Configuration

#### `SecurityConfig.java`
Định nghĩa rules bảo mật:
- `/api/v1/auth/**` gồm login/register, `/swagger-ui/**`, `/v3/api-docs/**`, `/swagger-ui.html`, `/actuator/health`, `/actuator/info`, `/actuator/prometheus` → **PUBLIC**
- `GET /api/v1/cameras/**` → ADMIN hoặc VIEWER
- `POST/PUT/DELETE /api/v1/cameras/**` → Chỉ ADMIN
- Tất cả còn lại → Cần token
- Session: `STATELESS` (không dùng session — JWT là stateless)
- CSRF: disabled (không cần với REST API + JWT)
- CORS dev/LAN cho `localhost`, `127.0.0.1` và private LAN origins (`192.168.*.*`, `10.*.*.*`, `172.16–31.*.*`) để người dùng cùng mạng truy cập UI qua `http://<IP-máy-host>:3000` vẫn login/register/API được

#### `RabbitMQConfig.java`
Khai báo topology RabbitMQ:
```
DirectExchange "alert.exchange"
    └── Queue "alert.notification.queue"  (binding key: "alert.notification")
```
Cấu hình JSON message converter để serialize/deserialize message tự động.

#### `OpenApiConfig.java`
Cấu hình Swagger UI: tên API, version, thêm ô nhập JWT Bearer token. Sau khi nhập token vào **Authorize**, mọi request từ Swagger UI sẽ tự gắn `Authorization: Bearer <token>`.

#### `PresetCameraSeeder.java` — [Dev]
Đọc `FIRESAFE_PRESET_CAMERA_*` từ process env/root `.env`, rồi tạo sẵn một camera RTSP nếu URL khác rỗng. Nếu camera cùng RTSP URL đã tồn tại thì không tạo trùng. File migration không seed camera fake nữa.

---

### ❗ `utils/GlobalExceptionHandler.java`

Bắt exception từ bất kỳ đâu → chuyển thành HTTP response chuẩn **RFC 7807 ProblemDetail**:

```json
{
  "title": "Validation failed",
  "status": 400,
  "errors": { "label": "label is required" }
}
```

| Exception | HTTP Status |
|---|---|
| `MethodArgumentNotValidException` | 400 — Input validation lỗi |
| `EntityNotFoundException` | 404 — Không tìm thấy resource |
| `IllegalArgumentException` | 400 — Logic nghiệp vụ sai |
| `BadCredentialsException` | 401 — Sai username/password |
| `AccessDeniedException` | 403 — Không đủ quyền |
| `Exception` (catch-all) | 500 — Lỗi không mong đợi |

---

## 📊 Tổng kết — Phân tầng kiến trúc

```
┌─────────────────────────────────────────────────┐
│  PRESENTATION LAYER (controllers/)               │
│  AuthController, AlertController, CameraCtrl   │
│  → Nhận HTTP, validate DTO, delegate           │
├─────────────────────────────────────────────────┤
│  BUSINESS LOGIC LAYER (services/)               │
│  AlertService, CameraService, NotifWorker      │
│  → Redis debounce, RabbitMQ publish, nghiệp vụ │
├─────────────────────────────────────────────────┤
│  DATA ACCESS LAYER (repositories/)               │
│  UserRepo, CameraRepo, AlertRepo               │
│  → JPA queries → SQL → MariaDB                 │
├─────────────────────────────────────────────────┤
│  DOMAIN MODEL (models/)                        │
│  User, Role, Camera, Alert                     │
│  → Java objects ánh xạ bảng database           │
└─────────────────────────────────────────────────┘

  CROSS-CUTTING CONCERNS:
  ├── middlewares/ → JWT filter xuyên suốt mọi request
  ├── dtos/        → Contract giữa API và client
  ├── configs/     → Wiring các Spring bean
  └── utils/       → JWT helper + error handling toàn cục
```

---

*Tài liệu phản ánh trạng thái backend tại **Giai đoạn 9**. Backend dùng cấu trúc strict layered packages (`controllers/`, `dtos/`, `services/`, `repositories/`, `models/`, `middlewares/`, `configs/`, `utils/`) và đã hỗ trợ login/register viewer-pending-activation với email `@nhattienchung.vn`, RBAC `ADMIN/VIEWER`, admin user activation/role editing, preset RTSP camera từ env, alert ingestion từ Worker, Redis debounce, RabbitMQ notification, MinIO snapshot URLs, metrics export nhẹ cho dashboard/Prometheus migration và Dockerfile cho Compose full stack.*
