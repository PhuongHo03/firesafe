# Rule: Cập nhật Planning Sau Mỗi Giai Đoạn

## Mục đích

Đảm bảo `docs/plannings/planning.md` luôn phản ánh đúng trạng thái thực tế của dự án. File này vừa là lộ trình kỹ thuật, vừa là **context duy nhất** để AI agent bắt đầu session mới mà không cần giải thích lại từ đầu.

---

## Khi nào phải cập nhật?

### BẮT BUỘC cập nhật sau khi:

- **Hoàn thành một giai đoạn** → đổi `⏳` sang `✅`, thêm "Những gì đã làm"
- **Bắt đầu giai đoạn mới** → cập nhật bảng "Trạng thái hiện tại" + "Việc tiếp theo"
- **Thêm service / component mới** → cập nhật section "Cấu trúc Project Hiện tại"
- **Thay đổi thông tin kết nối** → cập nhật bảng "Thông tin kết nối"
- **Thêm file explanation mới** → thêm vào cây cấu trúc và callout context của giai đoạn liên quan
- **Thay đổi stack công nghệ** → cập nhật bảng stack ở Giai đoạn 1

---

## Những gì cần cập nhật trong `planning.md`

### 1. Bảng "Trạng thái hiện tại" (đầu file)

```markdown
# Khi hoàn thành Giai đoạn X, bắt đầu Giai đoạn X+1:
| **Giai đoạn đang thực hiện** | ✅ Giai đoạn X — [Tên] |
| **Giai đoạn tiếp theo**      | ⏳ Giai đoạn X+1 — [Tên] |
```

### 2. Section "Việc tiếp theo" (đầu file)

Cập nhật checklist sang task của giai đoạn tiếp theo:
```markdown
## 🔜 Việc tiếp theo cần làm (Giai đoạn X+1)
- [ ] Task A
- [ ] Task B
```

### 3. Tiêu đề và nội dung giai đoạn

**Khi hoàn thành:**
```markdown
# Trước
### ⏳ Giai đoạn X — [Tên] *(Tuần ...)*
> **Trạng thái: CHƯA BẮT ĐẦU**
...checklist chưa làm...

# Sau
### ✅ Giai đoạn X — [Tên] *(Tuần ...)*
> **Trạng thái: HOÀN THÀNH**
> **Context cho session mới:** Đọc [file explanation liên quan]
**Những gì đã làm:**
- [bullet list những gì thực sự đã implement]
**Lưu ý:** [những điểm đặc biệt cần nhớ]
```

### 4. Footer explanation files

Sau khi hoàn thành giai đoạn X, cập nhật dòng cuối của **tất cả explanation files liên quan**:
```markdown
# Trong backend-explanation.md, infrastructure-explanation.md, v.v.:
*Tài liệu phản ánh trạng thái ... tại **Giai đoạn X**. ...*
```

### 5. Cấu trúc Project (khi có thư mục/file mới)

```markdown
d:\test-project\
├── docs/...
├── backend/...
├── frontend/          ← thêm khi khởi tạo Next.js
└── ai-worker/         ← thêm khi khởi tạo Python worker
```

---

## Ký hiệu trạng thái

| Ký hiệu | Ý nghĩa |
|---|---|
| `✅` | Giai đoạn đã hoàn thành |
| `⏳` | Giai đoạn chưa bắt đầu |
| `🔄` | Giai đoạn đang thực hiện (nếu cần) |

---

## Thứ tự thực hiện cuối mỗi task lớn

```
1. Viết/sửa code
2. Verify code chạy đúng
3. Cập nhật explanation file liên quan     ← rule: update-explanation.md
4. Cập nhật footer explanation file        ← rule này (bước 4)
5. Cập nhật planning.md                   ← rule này (bước 5)
```

---

## Mapping: Service mới → Việc cần cập nhật

| Service mới tạo | Explanation cần tạo | Cập nhật trong planning.md |
|---|---|---|
| `frontend/` | `frontend-explanation.md` | Cây cấu trúc + callout context Giai đoạn 5 |
| `ai-worker/` | `ai-worker-explanation.md` | Cây cấu trúc + callout context Giai đoạn 6 |
| `nginx/` config | `infrastructure-explanation.md` (update) | Bảng kết nối |
| `docker-compose.yml` (prod) | `infrastructure-explanation.md` (update) | Cây cấu trúc |
