# Kolektaku Backend API Documentation

Dokumen ini dibuat dari pembacaan source code pada folder `backend/src` (routes, controller, service, middleware).

## Ringkasan

- Base URL API: `/api`
- Format auth: `Authorization: Bearer <accessToken>`
- Middleware auth:
  - `authenticate`: validasi JWT access token
  - `requireRole(1)`: hanya admin
- Semua endpoint admin ada di bawah `/api/admin` dan selalu butuh token + role admin.

## Format Response Umum

Backend menggunakan `resHandler` sehingga response umumnya berbentuk:

```json
{
  "success": true,
  "message": "...",
  "creator": "NopTzy",
  "data": {}
}
```

Untuk response paginasi, properti top-level biasanya memuat:

- `data`: array hasil
- `total`, `page`, `limit`, `totalPages`

Catatan: beberapa controller mengirim instance `resHandler` langsung, beberapa memakai `.toJSON()`. Bentuk field inti tetap `success/message/data`.

## Error Handling Umum

- 400: payload/query/param tidak valid
- 401: token tidak ada/tidak valid/kedaluwarsa atau login gagal
- 403: role tidak diizinkan
- 404: resource tidak ditemukan
- 409: konflik (contoh email sudah dipakai)
- 500: kesalahan internal

---

## 1) Auth - `/api/auth`

### `GET /api/auth/google`
- Auth: Tidak
- Deskripsi: Memulai OAuth Google login.

### `GET /api/auth/google/callback`
- Auth: Tidak
- Deskripsi: Callback OAuth Google.
- Sukses: redirect ke `CLIENT_URL/auth/callback?accessToken=...&refreshToken=...`
- Gagal: redirect ke `CLIENT_URL/auth/callback?error=...`

### `GET /api/auth/google/failed`
- Auth: Tidak
- Deskripsi: Endpoint fallback login Google gagal.

### `POST /api/auth/register`
- Auth: Tidak
- Body:
  - `email` (required)
  - `password` (required)
  - `name` (optional)
- Catatan:
  - Email duplikat -> 409
  - Password di-hash bcrypt.

### `POST /api/auth/login`
- Auth: Tidak
- Body:
  - `email` (required)
  - `password` (required)
- Catatan:
  - Akun Google tanpa password -> 401
  - Sukses return access token + refresh token.

### `POST /api/auth/refresh`
- Auth: Tidak
- Body:
  - `refreshToken` (required)
- Catatan:
  - Verifikasi refresh token dan user.
  - Mengembalikan access token baru + refresh token existing.

### `POST /api/auth/logout`
- Auth: Ya (`authenticate`)
- Deskripsi: Revoke refresh token berdasarkan user login.

### `GET /api/auth/me`
- Auth: Ya (`authenticate`)
- Deskripsi: Ambil profile user saat ini.

---

## 2) Roles - `/api/roles`

### `GET /api/roles`
- Auth: Tidak (berdasarkan route saat ini)
- Deskripsi: Ambil semua role.

### `PUT /api/roles/:id`
- Auth: Tidak (berdasarkan route saat ini)
- Body:
  - `title`
- Deskripsi: Update role by id.

---

## 3) Users (Admin) - `/api/users`

Semua endpoint di group ini: Auth wajib + `requireRole(1)`.

### `GET /api/users`
- Query:
  - `page` (default `1`)
  - `limit` (default `20`)
  - `search` (optional)
- Deskripsi: Daftar user (paginasi).

### `GET /api/users/:id`
- Deskripsi: Detail user by id.

### `PUT /api/users/:id`
- Body: field profil user (bebas sesuai model), kecuali:
  - `password` diabaikan
  - `roleId` diabaikan
- Deskripsi: Update data user (aman, non-role/non-password).

### `PUT /api/users/:id/role`
- Body:
  - `roleId` (required)
- Deskripsi: Update role user.

### `DELETE /api/users/:id`
- Deskripsi: Hapus user.

### `POST /api/users/:id/membership`
- Body:
  - `planId` (required)
- Deskripsi: Assign membership plan ke user.
- Catatan:
  - Plan harus aktif.
  - User role diubah jadi premium (`roleId = 2`).

---

## 4) Anime Public - `/api/anime`

### `GET /api/anime`
- Query:
  - `page` (default `1`), `limit` (default `20`)
  - filter opsional: `type`, `status`, `contentRating`, `year`, `yearFrom`, `yearTo`, `genre`, `sort`, `q`
- Deskripsi: List anime + filter.

### `GET /api/anime/stats`
- Deskripsi: Statistik global anime.

### `GET /api/anime/filters`
- Deskripsi: Opsi filter untuk anime listing.

### `GET /api/anime/search`
- Query:
  - `q` (keyword)
  - `page`, `limit`
  - filter opsional: `type`, `status`, `contentRating`, `year`, `yearFrom`, `yearTo`, `genre`, `sort`
- Deskripsi: Search anime.

### `GET /api/anime/staff/:staffId`
- Query: `page` (default `1`), `limit` (default `20`), `sort` (default `newest`)
- Deskripsi: Anime berdasarkan staff.

### `GET /api/anime/studio/:studioId`
- Query: `page`, `limit`, `sort`
- Deskripsi: Anime berdasarkan studio.

### `GET /api/anime/va/:vaId`
- Query: `page`, `limit`, `sort`
- Deskripsi: Anime berdasarkan voice actor.

### `GET /api/anime/character/:characterId`
- Query: `page`, `limit`, `sort`
- Deskripsi: Anime berdasarkan karakter.

### `GET /api/anime/genre/:genre`
- Query: `page` (default `1`), `limit` (default `20`)
- Deskripsi: Anime berdasarkan genre.

### `GET /api/anime/:slug/eps`
- Deskripsi: List episode berdasarkan anime slug.

### `GET /api/anime/:slug/eps/:episodeNumber`
- Deskripsi: Stream/source episode berdasarkan slug + nomor episode.

### `GET /api/anime/:slug`
- Deskripsi: Detail anime by slug.

---

## 5) Membership Plans - `/api/plans`

### `GET /api/plans`
- Auth: Tidak
- Query:
  - `page` (default `1`)
  - `limit` (default `20`)
  - `includeInactive` (`true|false`, default `false`)
- Deskripsi: List plan membership.

### `GET /api/plans/:id`
- Auth: Tidak
- Deskripsi: Detail plan.

### `POST /api/plans`
- Auth: Ya + Admin
- Body:
  - `title` (required)
  - `desc` (optional)
  - `price` (optional)
  - `durationDays` (optional, `<=0` dianggap lifetime/null)
  - `isActive` (optional)
- Deskripsi: Create plan.

### `PUT /api/plans/:id`
- Auth: Ya + Admin
- Body: field plan yang diubah (partial).
- Deskripsi: Update plan.

### `DELETE /api/plans/:id`
- Auth: Ya + Admin
- Deskripsi: Delete plan.

---

## 6) Vouchers - `/api/vouchers`

### `GET /api/vouchers/active`
- Auth: Tidak
- Deskripsi: Ambil voucher aktif.

### `POST /api/vouchers/validate`
- Auth: Ya (`authenticate`)
- Body:
  - `code` (required)
- Deskripsi: Validasi voucher untuk user login.

### `GET /api/vouchers`
- Auth: Ya + Admin
- Query: `page` (default `1`), `limit` (default `20`)
- Deskripsi: List semua voucher.

### `GET /api/vouchers/:id`
- Auth: Ya + Admin
- Deskripsi: Detail voucher.

### `GET /api/vouchers/:id/usages`
- Auth: Ya + Admin
- Deskripsi: Riwayat penggunaan voucher.

### `POST /api/vouchers`
- Auth: Ya + Admin
- Body:
  - `code` (required)
  - `discountPercent` (required)
  - `maxUses` (optional)
  - `planId` (optional)
  - `expiresAt` (optional)
- Deskripsi: Create voucher.

### `PUT /api/vouchers/:id`
- Auth: Ya + Admin
- Body: partial voucher fields.

### `DELETE /api/vouchers/:id`
- Auth: Ya + Admin
- Deskripsi: Delete voucher.

Catatan validasi voucher:
- Harus aktif.
- Belum melewati `maxUses`.
- Belum expired.

---

## 7) Trial - `/api/trials`

### `POST /api/trials/activate`
- Auth: Ya
- Deskripsi: Aktivasi trial premium.
- Catatan:
  - Tidak bisa jika sudah pernah trial.
  - Tidak bisa jika sudah punya subscription aktif.
  - Sukses akan set role user ke premium (`roleId = 2`).

### `GET /api/trials/status`
- Auth: Ya
- Deskripsi: Status trial user saat ini.

### `GET /api/trials`
- Auth: Ya + Admin
- Query: `page`, `limit`
- Deskripsi: List semua record trial.

---

## 8) Me (User Library) - `/api/me`

Semua endpoint di group ini: Auth wajib (`authenticate`).

### Favorites

#### `GET /api/me/favorites`
- Query: `page` (default `1`), `limit` (default `20`)

#### `POST /api/me/favorites/:koleksiId`
- Deskripsi: Tambah koleksi ke favorit.
- Catatan:
  - Koleksi harus ada.
  - Tipe koleksi harus `anime`.

#### `DELETE /api/me/favorites/:koleksiId`
- Deskripsi: Hapus koleksi dari favorit.

### Watch History

#### `GET /api/me/history/watch`
- Query: `page`, `limit`

#### `POST /api/me/history/watch`
- Body:
  - `episodeId` (required)
  - `watchTimeSeconds` (optional, default `0`, min `0`)
  - `isCompleted` (optional, boolean)

### Read History

#### `GET /api/me/history/read`
- Query: `page`, `limit`

#### `POST /api/me/history/read`
- Body:
  - `chapterId` (required)
  - `lastPage` (optional, default `0`, min `0`)
  - `isCompleted` (optional, boolean)

### Notifications

#### `GET /api/me/notifications`
- Query:
  - `page` (default `1`)
  - `limit` (default `20`)
  - `unreadOnly` (`true|false`, optional)

#### `PATCH /api/me/notifications/:notificationId/read`
- Deskripsi: Tandai 1 notifikasi sudah dibaca.

#### `PATCH /api/me/notifications/read-all`
- Deskripsi: Tandai semua notifikasi user sudah dibaca.

---

## 9) Search - `/api/search`

### `GET /api/search`
- Auth: Tidak
- Query:
  - `q` (keyword, default string kosong)
  - `limit` (default `5`)
- Deskripsi: Search global (koleksi, studio, VA, karakter).
- Catatan: jika `q` kosong, response berisi array kosong per kategori.

---

## 10) Schedules Public - `/api/schedules`

### `GET /api/schedules`
- Auth: Tidak
- Deskripsi: Ambil jadwal tayang 30 hari dari hari ini.
- Catatan teknis:
  - Data dikelompokkan per tanggal GMT+7 (`YYYY-MM-DD`).

---

## 11) Admin - `/api/admin`

Semua endpoint berikut: Auth wajib + `requireRole(1)`.

### Stats

#### `GET /api/admin/stats`
- Deskripsi: Dashboard stats (users, anime, episodes, vouchers, plans).

### Broadcast

#### `GET /api/admin/broadcasts`
- Query: `page` (default `1`), `limit` (default `20`)

#### `POST /api/admin/broadcasts`
- Body minimum:
  - `title` (required)
  - `message` (required)
  - `level` (required, enum: `maintenance | info`)

### Schedules Admin

#### `POST /api/admin/schedules/fetch`
- Body:
  - `date` (optional)
  - `range` (optional, integer)
- Deskripsi:
  - Jika `range` ada -> trigger fetch range hari.
  - Jika tidak -> trigger fetch schedule berdasarkan `date`.

#### `GET /api/admin/sync/schedule`
- Query:
  - `date` (optional)
  - `days` (optional, default `7`)
- Deskripsi:
  - Jika `date` ada -> sync 1 tanggal.
  - Jika tidak -> sync batch sejumlah `days`.

### Anime Management

#### `POST /api/admin/anime/manual-add`
- Body:
  - `anilistUrl` (required; bisa URL atau angka)
  - `nineanimeUrl` (optional; URL atau angka)
  - `malUrl` (optional; URL atau angka)
  - `force` (optional, default `false`)
- Deskripsi:
  - Queue manual scrape berdasarkan ID sumber.
  - Jika anime sudah termapping dan `force=false`, return warning.

Catatan route: endpoint `POST /api/admin/anime/manual-add` terdefinisi dua kali di file route, handler sama.

#### `GET /api/admin/anime`
- Query:
  - `page` (default `1`)
  - `limit` (default `10`)
  - `search` (optional)
  - `mappedStatus` (optional)

#### `GET /api/admin/anime/:id`
- Deskripsi: Detail anime by id.

#### `POST /api/admin/anime`
- Body: payload anime baru (sesuai model internal).

#### `PUT /api/admin/anime/:id`
- Body: payload update anime (partial/full sesuai kebutuhan).

#### `PATCH /api/admin/anime/:id/visibility`
- Body:
  - `publishStatus` (required, enum: `published | hidden | draft | rejected`)

#### `DELETE /api/admin/anime/:id`
- Deskripsi: Hapus anime.

#### `POST /api/admin/anime/:id/scrape`
- Body:
  - `type` (required, enum: `detail | episodes`)
- Deskripsi: Trigger queue scraping.

### Episode Management

#### `GET /api/admin/anime-detail/:animeDetailId/episodes`
- Query: `page` (default `1`), `limit` (default `50`)

#### `POST /api/admin/anime-detail/:animeDetailId/episodes`
- Body: payload episode baru.

#### `PUT /api/admin/episodes/:episodeId`
- Body: payload update episode.

#### `DELETE /api/admin/episodes/:episodeId`
- Deskripsi: Hapus episode.

### Episode Sources

#### `GET /api/admin/episodes/:episodeId/sources`

#### `POST /api/admin/episodes/:episodeId/sources`
- Body: payload source episode (termasuk data server/source URL sesuai model).

#### `PUT /api/admin/sources/:sourceId`
- Body: payload update source.

#### `DELETE /api/admin/sources/:sourceId`

### Studio Management

#### `GET /api/admin/studios`
- Query: `page`, `limit`, `search`

#### `GET /api/admin/studios/:id`

#### `POST /api/admin/studios`
- Body:
  - `name` (required)
  - `anilistId` (required)
  - `isAnimationStudio` (optional)
  - `description` (optional)

#### `PUT /api/admin/studios/:id`
- Body: partial studio fields.

#### `DELETE /api/admin/studios/:id`

### Voice Actor Management

#### `GET /api/admin/vas`
- Query: `page`, `limit`, `search`

#### `GET /api/admin/vas/:id`

#### `POST /api/admin/vas`
- Body:
  - `name` (required)
  - `anilistId` (required)
  - `imageUrl` (optional)

#### `PUT /api/admin/vas/:id`
- Body: partial VA fields.

#### `DELETE /api/admin/vas/:id`

### Character Management

#### `GET /api/admin/characters`
- Query: `page`, `limit`, `search`

#### `GET /api/admin/characters/:id`

#### `POST /api/admin/characters`
- Body:
  - `name` (required)
  - `imageUrl` (optional)

#### `PUT /api/admin/characters/:id`
- Body: partial character fields.

#### `DELETE /api/admin/characters/:id`

### Genre Management

#### `GET /api/admin/genres`
- Query: `page` (default `1`), `limit` (default `50`)

#### `GET /api/admin/genres/:id`

#### `POST /api/admin/genres`
- Body:
  - `name` (required)
  - `isNsfw` (optional)

#### `PUT /api/admin/genres/:id`
- Body: partial genre fields.

#### `DELETE /api/admin/genres/:id`

### Mapping Management

#### `GET /api/admin/mappings`
- Query:
  - `page` (default `1`)
  - `limit` (default `20`)
  - `status` (default `pending`)
  - `search` (default string kosong)

#### `GET /api/admin/mappings/:id`

#### `POST /api/admin/mappings/:id/approve`
- Body:
  - `candidateId` (required)

#### `POST /api/admin/mappings/:id/ignore`

#### `POST /api/admin/mappings/:id/manual`
- Body:
  - `koleksiId` (required)

#### `POST /api/admin/mappings/connect/:koleksiId`
- Body: payload koneksi anime (umumnya mencakup data mapping seperti `anilistId`, `nineanimeId` bila ada).

#### `DELETE /api/admin/mappings/connect/:koleksiId`

### Audit Logs

#### `GET /api/admin/audit-logs`
- Query:
  - `page` (default `1`)
  - `limit` (default `20`)
  - `adminId` (optional)
  - `entityType` (optional)

---

## Auth & Role Matrix Singkat

- Public: `/api/anime/*`, `/api/search`, `/api/schedules`, `GET /api/plans`, `GET /api/vouchers/active`, sebagian `/api/auth`.
- Auth user: `/api/me/*`, `/api/trials/activate`, `/api/trials/status`, `/api/auth/logout`, `/api/auth/me`, `/api/vouchers/validate`.
- Admin: `/api/admin/*`, `/api/users/*`, write endpoints `/api/plans/*` (POST/PUT/DELETE), admin endpoints `/api/vouchers/*`, `GET /api/trials`.

## Catatan Implementasi Penting

- Token access diverifikasi dari `JWT_ACCESS_TOKEN`.
- Endpoint `/api/admin/anime/manual-add` didaftarkan dua kali di route (handler sama).
- Role route (`/api/roles`) saat ini tidak diproteksi middleware auth di file route.
- Beberapa validasi payload ada di service layer, bukan controller, sehingga dokumentasi ini mengikuti perilaku runtime dari route+controller+service.
