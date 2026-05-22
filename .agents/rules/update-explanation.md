# Rule: Cập nhật Explanation File Khi Sửa Code

## Nguyên tắc

Mỗi khi thực hiện thay đổi code trong bất kỳ service nào của project, **phải** cập nhật file explanation tương ứng trong `docs/explanations/` để đảm bảo tài liệu luôn phản ánh đúng trạng thái thực tế của codebase.

---

## Mapping Service → Explanation File

| Service / Thư mục thay đổi | File explanation cần cập nhật |
|---|---|
| `backend/` | `docs/explanations/backend-explanation.md` |
| `frontend/` | `docs/explanations/frontend-explanation.md` |
| `ai-worker/` | `docs/explanations/ai-worker-explanation.md` |
| `docker-compose*.yml` | `docs/explanations/infrastructure-explanation.md` |

> Nếu chưa có file explanation cho service vừa tạo mới, **phải tạo file đó** theo cùng format với `backend-explanation.md`.

---

## Những thay đổi nào cần cập nhật explanation?

### ✅ BẮT BUỘC cập nhật khi:

- **Thêm file mới** → cập nhật cây cấu trúc + thêm mục giải thích cho file mới
- **Xóa file** → xóa khỏi cây cấu trúc + xóa mục giải thích tương ứng
- **Đổi tên file hoặc folder** → cập nhật mọi chỗ đề cập đến tên cũ
- **Thêm endpoint mới** vào controller → cập nhật bảng endpoint trong section controller
- **Thay đổi logic nghiệp vụ quan trọng** trong service → cập nhật phần mô tả luồng xử lý
- **Thêm dependency mới** vào `pom.xml` / `package.json` → cập nhật bảng dependencies
- **Thêm bảng DB mới** (migration) → cập nhật phần `db/migration/`
- **Thay đổi cấu hình** `application.yml` (thêm section mới) → cập nhật bảng config

### ⚠️ Không cần cập nhật khi:

- Sửa bug nhỏ không thay đổi interface/behavior bên ngoài
- Refactor nội bộ (không đổi tên class, method signature, endpoint)
- Thêm log statement, comment
- Sửa lỗi typo trong code

---

## Cách cập nhật

### 1. Cập nhật cây cấu trúc

Nếu thêm/xóa/đổi tên file, tìm đúng vị trí trong cây ASCII và chỉnh sửa. Ví dụ thêm `UserController.java`:

```
# Trước
│   ├── controller/
│   │   ├── AuthController.java
│   │   └── AlertController.java

# Sau
│   ├── controller/
│   │   ├── AuthController.java
│   │   ├── AlertController.java
│   │   └── UserController.java              ← POST/GET /api/v1/users
```

### 2. Cập nhật phần giải thích tương ứng

Tìm đến section của folder/file đó và cập nhật nội dung. Giữ đúng format:
- Dùng heading `####` cho từng file con
- Dùng bảng markdown cho danh sách endpoint, dependency, config
- Dùng code block có ngôn ngữ cho ví dụ code

### 3. Cập nhật dòng footer — **BẮT BUỘC, KHÔNG ĐƯỢC BỎ QUA**

> ⚠️ **Đây là bước hay bị quên nhất. Sau khi cập nhật nội dung, LUÔN kiểm tra và cập nhật dòng cuối file.**

Dòng cuối mỗi file explanation có dạng:
```markdown
*Tài liệu phản ánh trạng thái backend tại **Giai đoạn X**. ...*
```

**Khi nào cập nhật:** Sau khi hoàn thành một giai đoạn mới (dù file đó có thay đổi nội dung hay không).
- File có thay đổi trực tiếp → cập nhật số giai đoạn + mô tả ngắn những gì mới
- File **không** có thay đổi nhưng project đã qua giai đoạn mới → vẫn cập nhật số giai đoạn

Ví dụ:
```markdown
# Trước (sau Giai đoạn 2)
*Tài liệu phản ánh trạng thái backend tại **Giai đoạn 2**. Các phần TODO Phase 3...*

# Sau (sau Giai đoạn 3)
*Tài liệu phản ánh trạng thái backend tại **Giai đoạn 3**. Bao gồm: MinioService, TelegramNotificationService...*
```

---

## Thứ tự thực hiện

Khi hoàn thành một task code, làm **đúng thứ tự** sau — không bỏ bước nào:

1. Viết/sửa code
2. Xác nhận code chạy đúng
3. Cập nhật cây cấu trúc + phần giải thích trong explanation file
4. **Cập nhật dòng footer** — ghi đúng giai đoạn hiện tại (bước này hay bị quên)
5. Cập nhật `planning.md` theo rule `update-planning.md`

---

## Ví dụ thực tế

**Task:** Thêm `UserController.java` và `UserService.java` vào backend

**Các cập nhật cần thiết trong `backend-explanation.md`:**

1. Cây cấu trúc → thêm 2 dòng vào `controller/` và `service/`
2. Section `controller/` → thêm bảng endpoint của `UserController`
3. Section `service/` → thêm mô tả `UserService`
4. Section `Tổng kết` → cập nhật nếu layer thay đổi đáng kể
5. **Dòng footer** → đổi thành giai đoạn hiện tại, ví dụ `Giai đoạn 4`
