# Report, Comments, & Global Chat

Tiga fitur baru: Lapor Episode, Komentar Episode, dan Global Chat.

## Proposed Changes

---

### 1. Database Schema (Prisma)

#### [MODIFY] [schema.prisma](file:///d:/Codingan/Kerjaan/Kolektaku/services/backend/prisma/schema.prisma)

Tambah 3 model baru + enum + relasi ke [User](file:///d:/Codingan/Kerjaan/Kolektaku/apps/frontend/src/lib/adminApi.js#4-9) dan [Episode](file:///d:/Codingan/Kerjaan/Kolektaku/apps/frontend/src/lib/adminApi.js#56-61):

```prisma
enum ReportCategory {
  wrong_episode
  broken_video
  wrong_subtitle
  missing_subtitle
  other
  @@map("report_category")
}

enum ReportStatus {
  pending
  resolved
  dismissed
  @@map("report_status")
}

model EpisodeReport {
  id         String         @id @default(uuid(7)) @db.Uuid
  userId     String         @map("user_id") @db.Uuid
  episodeId  String         @map("episode_id") @db.Uuid
  category   ReportCategory
  message    String?        @db.Text
  status     ReportStatus   @default(pending)
  resolvedAt DateTime?      @map("resolved_at")
  createdAt  DateTime?      @map("created_at")

  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  episode Episode @relation(fields: [episodeId], references: [id], onDelete: Cascade)

  @@unique([userId, episodeId])     // 1 report per user per episode
  @@index([episodeId])
  @@index([status])
  @@map("episode_reports")
}

model EpisodeComment {
  id        String    @id @default(uuid(7)) @db.Uuid
  userId    String    @map("user_id") @db.Uuid
  episodeId String    @map("episode_id") @db.Uuid
  content   String    @db.Text
  createdAt DateTime? @map("created_at")
  updatedAt DateTime? @map("updated_at")

  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  episode Episode @relation(fields: [episodeId], references: [id], onDelete: Cascade)

  @@index([episodeId, createdAt])
  @@map("episode_comments")
}

model ChatMessage {
  id        String    @id @default(uuid(7)) @db.Uuid
  userId    String    @map("user_id") @db.Uuid
  content   String    @db.Text
  createdAt DateTime? @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([createdAt])
  @@map("chat_messages")
}
```

Relasi baru di [User](file:///d:/Codingan/Kerjaan/Kolektaku/apps/frontend/src/lib/adminApi.js#4-9): `episodeReports`, `episodeComments`, `chatMessages`
Relasi baru di [Episode](file:///d:/Codingan/Kerjaan/Kolektaku/apps/frontend/src/lib/adminApi.js#56-61): `reports`, `comments`

---

### 2. Backend — Report System

#### [NEW] [reportRepository.js](file:///d:/Codingan/Kerjaan/Kolektaku/services/backend/src/repository/reportRepository.js)
- [create(userId, episodeId, category, message)](file:///d:/Codingan/Kerjaan/Kolektaku/services/backend/src/service/adminService.js#117-125) — upsert report
- `findByEpisode(episodeId)` — semua laporan per episode
- [findAll({ status, page, limit })](file:///d:/Codingan/Kerjaan/Kolektaku/services/backend/src/repository/animeRepository.js#113-140) — admin: daftar semua laporan + join episode+anime title
- `updateStatus(id, status)` — admin: resolve/dismiss
- `getStats()` — total pending, resolved, dismissed

#### [NEW] [reportService.js](file:///d:/Codingan/Kerjaan/Kolektaku/services/backend/src/service/reportService.js)
- `submitReport(userId, episodeId, data)` — validasi + create
- `getReports(filters)` — admin list
- `resolveReport(id)` / `dismissReport(id)`

#### [NEW] [reportController.js](file:///d:/Codingan/Kerjaan/Kolektaku/services/backend/src/controller/reportController.js)
- `POST /api/anime/:slug/eps/:episodeNumber/report` — user submit
- `GET /api/admin/reports` — admin list
- `PATCH /api/admin/reports/:id/resolve` — admin action
- `PATCH /api/admin/reports/:id/dismiss` — admin action

---

### 3. Backend — Episode Comments

#### [NEW] [commentRepository.js](file:///d:/Codingan/Kerjaan/Kolektaku/services/backend/src/repository/commentRepository.js)
- [create(userId, episodeId, content)](file:///d:/Codingan/Kerjaan/Kolektaku/services/backend/src/service/adminService.js#117-125)
- `findByEpisode(episodeId, { page, limit })` — paginated, join user (name, avatar)
- `deleteById(id)` — admin atau pemilik komentar
- `countByEpisode(episodeId)`

#### [NEW] [commentService.js](file:///d:/Codingan/Kerjaan/Kolektaku/services/backend/src/service/commentService.js)
- `addComment(userId, episodeId, content)` — validasi panjang (max 500 char)
- `getComments(episodeId, page)` — paginated
- `deleteComment(commentId, userId, isAdmin)`

#### [NEW] [commentController.js](file:///d:/Codingan/Kerjaan/Kolektaku/services/backend/src/controller/commentController.js)
- `POST /api/anime/:slug/eps/:episodeNumber/comments` — user post comment
- `GET /api/anime/:slug/eps/:episodeNumber/comments` — public get (paginated)
- `DELETE /api/anime/:slug/eps/:episodeNumber/comments/:id` — delete by owner/admin

---

### 4. Backend — Global Chat

#### [NEW] [chatRepository.js](file:///d:/Codingan/Kerjaan/Kolektaku/services/backend/src/repository/chatRepository.js)
- [create(userId, content)](file:///d:/Codingan/Kerjaan/Kolektaku/services/backend/src/service/adminService.js#117-125)
- [findRecent({ limit, before })](file:///d:/Codingan/Kerjaan/Kolektaku/services/backend/src/repository/animeRepository.js#884-926) — cursor-based pagination, join user
- `deleteById(id)` — admin only

#### [NEW] [chatService.js](file:///d:/Codingan/Kerjaan/Kolektaku/services/backend/src/service/chatService.js)
- `sendMessage(userId, content)` — validasi max 300 char
- `getMessages({ limit, before })` — cursor pagination
- `deleteMessage(id)` — admin

#### [NEW] [chatController.js](file:///d:/Codingan/Kerjaan/Kolektaku/services/backend/src/controller/chatController.js)
- `POST /api/chat` — user send
- `GET /api/chat?limit=50&before=cursor` — get messages
- `DELETE /api/chat/:id` — admin delete

#### [MODIFY] [routes/index.js](file:///d:/Codingan/Kerjaan/Kolektaku/services/backend/src/routes/index.js)
- Daftarkan route `/chat` baru

---

### 5. Frontend — Report Button (Watch Page)

#### [MODIFY] [eps/[episodeNumber]/page.js](file:///d:/Codingan/Kerjaan/Kolektaku/apps/frontend/src/app/anime/%5Bslug%5D/eps/%5BepisodeNumber%5D/page.js)
- Tambah tombol "🚩 Lapor" di bawah info episode (di atas komentar)
- Klik → SweetAlert2 form: pilih kategori (dropdown) + pesan opsional → submit ke API

#### [MODIFY] [animeApi.js](file:///d:/Codingan/Kerjaan/Kolektaku/apps/frontend/src/lib/animeApi.js)
- `reportEpisode(slug, episodeNumber, { category, message })`

---

### 6. Frontend — Episode Comments (Watch Page)

#### [NEW] [EpisodeComments.jsx](file:///d:/Codingan/Kerjaan/Kolektaku/apps/frontend/src/components/EpisodeComments.jsx)
- Komponen terpisah yang menerima `slug` & `episodeNumber`
- Menampilkan daftar komentar (avatar, nama, waktu, isi)
- Form input komentar di atas list
- Tombol "Load More" (pagination)
- Owner/admin bisa hapus komentar sendiri

#### [MODIFY] [eps/[episodeNumber]/page.js](file:///d:/Codingan/Kerjaan/Kolektaku/apps/frontend/src/app/anime/%5Bslug%5D/eps/%5BepisodeNumber%5D/page.js)
- Import & render `<EpisodeComments>` di bawah daftar episode

---

### 7. Frontend — Global Chat Page

#### [NEW] [chat/page.js](file:///d:/Codingan/Kerjaan/Kolektaku/apps/frontend/src/app/chat/page.js)
- Halaman full chat dengan scroll infinite ke atas (load older messages)
- Input chat di bawah, list pesan di atas
- Setiap pesan: avatar + nama + waktu + isi
- Auto-refresh setiap 5 detik (polling) untuk real-time feel
- Admin badge di samping nama admin

#### [NEW] [chatApi.js](file:///d:/Codingan/Kerjaan/Kolektaku/apps/frontend/src/lib/chatApi.js)
- `sendMessage(content)`
- `getMessages({ limit, before })`
- `deleteMessage(id)`

#### [MODIFY] [Navbar.jsx](file:///d:/Codingan/Kerjaan/Kolektaku/apps/frontend/src/components/Navbar.jsx)
- Tambah link "Chat" di navigasi utama

---

### 8. Frontend — Admin Reports Dashboard

#### [NEW] [admin/reports/page.js](file:///d:/Codingan/Kerjaan/Kolektaku/apps/frontend/src/app/admin/reports/page.js)
- Tabel laporan: anime title, episode, kategori, user, status, waktu
- Filter by status (pending/resolved/dismissed)
- Tombol Resolve / Dismiss per laporan
- Link ke halaman episode yang dilaporkan

#### [MODIFY] [adminApi.js](file:///d:/Codingan/Kerjaan/Kolektaku/apps/frontend/src/lib/adminApi.js)
- `getReports(params)`, `resolveReport(id)`, `dismissReport(id)`

#### [MODIFY] Admin Sidebar
- Tambah menu "Reports" di sidebar admin

---

## Verification Plan

### Automated Tests
- Prisma migrate dev → pastikan schema valid
- Test API endpoints: POST report, GET reports, POST comment, GET comments, POST chat, GET chat

### Manual Verification
1. **Report**: Nonton episode → klik Lapor → pilih kategori → submit → cek di admin dashboard
2. **Comment**: Ketik komentar di bawah episode → submit → muncul di list → coba hapus
3. **Chat**: Buka halaman chat → kirim pesan → pesan muncul → buka di browser lain → pesan terlihat
