# 📁 Backend — Cấu trúc Project

> Cây thư mục đầy đủ và chính xác của `backend/`, phản ánh trạng thái thực tế trên disk.

---

```
backend/
│
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
    │   │   ├── config/                              ← Khai báo Bean & cấu hình Spring
    │   │   │   ├── AdminPasswordFixer.java          ← [Dev] Reset mật khẩu admin khi start
    │   │   │   ├── DemoCameraSeeder.java            ← [Dev] Seed camera RTSP từ backend/.env.local
    │   │   │   ├── OpenApiConfig.java               ← Swagger UI + JWT Bearer scheme
    │   │   │   ├── RabbitMQConfig.java              ← Exchange, Queue, Binding, Converter
    │   │   │   └── SecurityConfig.java              ← Filter chain, role-based auth rules
    │   │   │
    │   │   ├── controller/                          ← REST API — nhận request, trả response
    │   │   │   ├── AuthController.java              ← POST /api/v1/auth/login
    │   │   │   ├── AlertController.java             ← GET/POST /api/v1/alerts
    │   │   │   └── CameraController.java            ← CRUD /api/v1/cameras
    │   │   │
    │   │   ├── dto/                                 ← Data Transfer Objects (API contract)
    │   │   │   ├── LoginRequest.java                ← {username, password}
    │   │   │   ├── LoginResponse.java               ← {token, username, roles[]}
    │   │   │   ├── AlertRequest.java                ← Payload AI Worker gửi lên
    │   │   │   ├── AlertResponse.java               ← Alert kèm tên camera trả về client
    │   │   │   ├── CameraRequest.java               ← Tạo/cập nhật camera
    │   │   │   └── CameraResponse.java              ← Thông tin camera trả về client
    │   │   │
    │   │   ├── entity/                              ← ORM Model — ánh xạ Java class ↔ bảng DB
    │   │   │   ├── User.java                        ← Bảng users
    │   │   │   ├── Role.java                        ← Bảng roles
    │   │   │   ├── Camera.java                      ← Bảng cameras
    │   │   │   └── Alert.java                       ← Bảng alerts
    │   │   │
    │   │   ├── exception/                           ← Xử lý lỗi toàn cục
    │   │   │   └── GlobalExceptionHandler.java      ← Bắt exception → HTTP response chuẩn RFC 7807
    │   │   │
    │   │   ├── repository/                          ← Data Access Layer — giao tiếp với DB
    │   │   │   ├── UserRepository.java              ← Tìm user theo username
    │   │   │   ├── CameraRepository.java            ← CRUD cameras
    │   │   │   └── AlertRepository.java             ← Lưu và query alerts có phân trang
    │   │   │
    │   │   ├── security/                            ← JWT Authentication
    │   │   │   ├── JwtUtils.java                    ← Tạo token, parse token, validate
    │   │   │   ├── JwtAuthFilter.java               ← Interceptor đọc Bearer token mỗi request
    │   │   │   └── UserDetailsServiceImpl.java      ← Load user từ DB cho Spring Security
    │   │   │
    │   │   └── service/                             ← Business Logic
    │   │       ├── AlertService.java                ← Lưu alert + Redis debounce + RabbitMQ publish
    │   │       ├── CameraService.java               ← CRUD logic cho cameras
    │   │       ├── MinioService.java                ← Upload ảnh, tạo pre-signed URL
    │   │       ├── TelegramNotificationService.java ← Gọi Telegram Bot API
    │   │       └── NotificationWorker.java          ← RabbitMQ consumer + retry logic
    │   │
    │   └── resources/
    │       │
    │       ├── application.yml                      ← Cấu hình toàn bộ ứng dụng (DB, Redis, MQ, JWT)
    │       │
    │       └── db/
    │           └── migration/                       ← Flyway — tự chạy SQL khi app khởi động
    │               ├── V1__init_schema.sql          ← Tạo 5 bảng + indexes
    │               └── V2__seed_data.sql            ← Seed roles, admin user, camera test
    │
    └── test/
        └── java/com/firesafe/backend/
            └── BackendApplicationTests.java         ← Test khởi động context Spring Boot
```

---

## 📌 Lưu ý về cấu trúc

- **`mvnw` / `mvnw.cmd`** là Maven Wrapper scripts — cho phép build project mà không cần cài Maven trên máy. Chạy `./mvnw spring-boot:run` thay cho `mvn spring-boot:run`
- Các file `.gitattributes`, `.gitignore`, `HELP.md` ở root `backend/` là file sinh tự động bởi Spring Initializr — không ảnh hưởng đến logic ứng dụng


---

## 🗺️ Luồng dữ liệu tổng quan

```
HTTP Request đến
    │
    ▼
[JwtAuthFilter]         → Kiểm tra token JWT trong header Authorization
    │
    ▼
[SecurityConfig]        → Kiểm tra quyền truy cập (role có phù hợp không?)
    │
    ▼
[Controller]            → Nhận request, validate DTO, gọi Service
    │
    ▼
[Service]               → Xử lý logic nghiệp vụ (Redis, RabbitMQ, DB)
    │
    ▼
[Repository]            → Giao tiếp với MariaDB qua JPA/Hibernate
    │
    ▼
[Entity]                → Ánh xạ Java object ↔ bảng database
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
| `lombok` | Tự sinh getter/setter/constructor — giảm boilerplate |

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
spring.datasource.url: jdbc:mariadb://${DB_HOST:localhost}:3306/firesafe
# → Khi dev local: dùng localhost
# → Khi chạy Docker: truyền DB_HOST=mariadb
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


### 🗃️ `db/migration/` — Flyway Database Migrations

**Vai trò:** Thay thế chạy SQL tay. Mỗi lần ứng dụng khởi động, Flyway kiểm tra bảng `flyway_schema_history` trong DB và tự động chạy các file chưa được chạy theo đúng thứ tự version.

> **Quy tắc bắt buộc:** `V{số}__{mô_tả}.sql` — số tăng dần, **tuyệt đối không sửa file đã chạy** (Flyway sẽ báo lỗi checksum mismatch).

#### `V1__init_schema.sql`
Tạo toàn bộ 5 bảng và các index tối ưu query:

| Bảng | Mục đích |
|---|---|
| `roles` | Lưu các role: ROLE_ADMIN, ROLE_OPERATOR, ROLE_VIEWER |
| `users` | Tài khoản người dùng hệ thống |
| `user_roles` | Bảng trung gian many-to-many User ↔ Role |
| `cameras` | Thông tin camera IP (RTSP URL, vị trí lắp đặt) |
| `alerts` | Lịch sử sự kiện phát hiện lửa/khói |

#### `V2__seed_data.sql`
Chèn dữ liệu ban đầu: 3 roles, 1 admin user (password: `admin123` — BCrypt hashed), 1 camera test.

---

### 🗄️ `entity/` — ORM Model

**Vai trò:** Mỗi class ánh xạ trực tiếp với một bảng trong database. Hibernate đọc JPA annotation để sinh SQL tương ứng.

#### `Role.java` → bảng `roles`
Chứa tên role dạng chuỗi. Spring Security yêu cầu prefix `ROLE_` (`ROLE_ADMIN`, `ROLE_OPERATOR`, `ROLE_VIEWER`).

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

### 💾 `repository/` — Data Access Layer

**Vai trò:** Interface giao tiếp với database. Spring Data JPA tự động sinh implementation, không cần viết SQL thủ công.

```java
// Spring tự dịch method name → SQL
Page<Alert> findByCameraIdOrderByDetectedAtDesc(Long cameraId, Pageable pageable);
// → SELECT * FROM alerts WHERE camera_id = ? ORDER BY detected_at DESC LIMIT ? OFFSET ?
```

| File | Vai trò chính |
|---|---|
| `UserRepository` | `findByUsername()` — dùng mỗi lần xác thực JWT token |
| `CameraRepository` | CRUD + `findByIsActiveTrue()` — lấy camera đang hoạt động |
| `AlertRepository` | Lưu alert + query phân trang (tránh load hàng nghìn record) |

---

### 📦 `dto/` — Data Transfer Objects

**Vai trò:** Tách biệt dữ liệu API khỏi dữ liệu database.

**Tại sao không dùng Entity trực tiếp?**
- Entity `User` có field `passwordHash` — không được trả về client
- `AlertResponse` cần `cameraName` — phải join từ bảng khác, Entity không có sẵn
- Validation annotation (`@NotBlank`) nên nằm ở DTO, không phải Entity

| DTO | Hướng | Nội dung |
|---|---|---|
| `LoginRequest` | Client → Server | `{username, password}` |
| `LoginResponse` | Server → Client | `{token, username, roles[]}` |
| `AlertRequest` | AI Worker → Server | Payload khi phát hiện lửa/khói |
| `AlertResponse` | Server → Client | Alert kèm `cameraName` |
| `CameraRequest` | Client → Server | Tạo/cập nhật camera |
| `CameraResponse` | Server → Client | Thông tin camera (ẩn field internal) |

---

### ⚙️ `service/` — Business Logic

**Vai trò:** Xử lý logic nghiệp vụ. Controller không được chứa logic, chỉ gọi Service.

#### `AlertService.java` — Quan trọng nhất

Luồng khi AI Worker gửi một alert:
```
1. Tìm Camera theo camera_id → 400 nếu không tồn tại
2. Tạo Alert entity → lưu vào MariaDB
3. Kiểm tra Redis key "alert:debounce:{camera_id}"
   ├── Key CHƯA tồn tại → camera chưa báo cháy gần đây
   │     → Set key TTL 5 phút (atomic SETNX — tránh race condition)
   │     → Publish alertId lên RabbitMQ → sẽ gửi Zalo/Telegram
   └── Key ĐÃ tồn tại → đã báo trong 5 phút qua
         → Chỉ lưu DB, KHÔNG gửi notification (chống spam)
4. Trả về AlertResponse
```

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

### 🔒 `security/` — JWT Authentication

#### `JwtUtils.java`
- `generateToken()` → tạo JWT ký bằng HMAC-SHA256 với secret key
- `extractUsername()` → parse token → lấy username
- `validateToken()` → kiểm tra username khớp + chưa hết hạn

#### `JwtAuthFilter.java`
Chạy **trước mọi request**:
```
1. Đọc header: Authorization: Bearer <token>
2. Parse token → lấy username
3. Load UserDetails từ DB
4. Validate token
5. Đưa Authentication vào SecurityContextHolder
```
Nếu token không hợp lệ → request tiếp tục nhưng không có Authentication → SecurityConfig reject 401.

#### `UserDetailsServiceImpl.java`
"Dạy" Spring Security cách load user từ MariaDB:
```java
loadUserByUsername("admin")
    → UserRepository.findByUsername("admin")
    → convert User entity → Spring Security UserDetails
    → trả về: username, passwordHash, authorities (roles)
```

---

### 🌐 `controller/` — REST API Layer

**Vai trò:** Nhận HTTP request, validate input, gọi Service, trả HTTP response. **Không chứa business logic.**

#### `AuthController` — `POST /api/v1/auth/login`
```
LoginRequest → AuthenticationManager.authenticate()
             → BCrypt.verify(password, hash)
             → JwtUtils.generateToken()
             → LoginResponse {token, username, roles}
```

#### `AlertController`

| Endpoint | Method | Mô tả |
|---|---|---|
| `/api/v1/alerts` | POST | AI Worker gửi alert mới |
| `/api/v1/alerts?cameraId=1&page=0` | GET | Danh sách alerts (filter + phân trang) |
| `/api/v1/alerts/{id}` | GET | Chi tiết một alert |

#### `CameraController`

| Endpoint | Method | Auth | Mô tả |
|---|---|---|---|
| `/api/v1/cameras` | GET | Mọi role | Danh sách cameras |
| `/api/v1/cameras/{id}` | GET | Mọi role | Chi tiết camera |
| `/api/v1/cameras` | POST | ADMIN | Thêm camera |
| `/api/v1/cameras/{id}` | PUT | ADMIN | Cập nhật camera |
| `/api/v1/cameras/{id}` | DELETE | ADMIN | Xóa camera |

---

### ⚙️ `config/` — Spring Configuration

#### `SecurityConfig.java`
Định nghĩa rules bảo mật:
- `/api/v1/auth/**`, `/swagger-ui/**`, `/actuator/prometheus` → **PUBLIC**
- `GET /api/v1/cameras/**` → Mọi role có token
- `POST/PUT/DELETE /api/v1/cameras/**` → Chỉ ADMIN
- Tất cả còn lại → Cần token
- Session: `STATELESS` (không dùng session — JWT là stateless)
- CSRF: disabled (không cần với REST API + JWT)

#### `RabbitMQConfig.java`
Khai báo topology RabbitMQ:
```
DirectExchange "alert.exchange"
    └── Queue "alert.notification.queue"  (binding key: "alert.notification")
```
Cấu hình JSON message converter để serialize/deserialize message tự động.

#### `OpenApiConfig.java`
Cấu hình Swagger UI: tên API, version, thêm ô nhập JWT Bearer token. Sau khi nhập token vào **Authorize**, mọi request từ Swagger UI sẽ tự gắn `Authorization: Bearer <token>`.

#### `AdminPasswordFixer.java` — [Dev]
**Mục đích:** Khi lần đầu chạy app, hash BCrypt của `admin123` trong `V2__seed_data.sql` không hợp lệ nên login bị từ chối. Class này chạy một lần sau khi Spring Boot khởi động xong (thông qua `CommandLineRunner`), tự động tính lại hash BCrypt chính xác và cập nhật vào DB.

| Thuộc tính | Giá trị |
|---|---|
| Tài khoản | `admin` |
| Mật khẩu | `admin123` |
| Bước chạy | Sau Flyway migration, trước khi nhận request |
| Log xác nhận | `🔥 FIXED ADMIN PASSWORD HASH IN DATABASE!` |

> ⚠️ **Lưu ý:** Hash trong `V2__seed_data.sql` không hợp lệ và **không sửa** vì Flyway cấm sửa file migration đã chạy (sẽ báo lỗi checksum). `AdminPasswordFixer` là giải pháp vĩnh viễn cho môi trường dev.

---

### ❗ `exception/GlobalExceptionHandler.java`

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
│  PRESENTATION LAYER (controller/)               │
│  AuthController, AlertController, CameraCtrl   │
│  → Nhận HTTP, validate DTO, delegate           │
├─────────────────────────────────────────────────┤
│  BUSINESS LOGIC LAYER (service/)               │
│  AlertService, CameraService, NotifWorker      │
│  → Redis debounce, RabbitMQ publish, nghiệp vụ │
├─────────────────────────────────────────────────┤
│  DATA ACCESS LAYER (repository/)               │
│  UserRepo, CameraRepo, AlertRepo               │
│  → JPA queries → SQL → MariaDB                 │
├─────────────────────────────────────────────────┤
│  DOMAIN MODEL (entity/)                        │
│  User, Role, Camera, Alert                     │
│  → Java objects ánh xạ bảng database           │
└─────────────────────────────────────────────────┘

  CROSS-CUTTING CONCERNS:
  ├── security/   → JWT auth xuyên suốt mọi request
  ├── dto/        → Contract giữa API và client
  ├── config/     → Wiring các Spring bean
  └── exception/  → Error handling toàn cục
```

---

*Tài liệu phản ánh trạng thái backend hoàn thiện tại **Giai đoạn 6**. Backend chưa đổi trong MVP AI Worker video local.*
