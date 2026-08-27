# Easy Expense

Aplikasi pencatat pengeluaran proyek dengan AI scan struk (Bahasa Indonesia, Rupiah).
Frontend: Expo Router (React Native). Backend: FastAPI + MongoDB.

Project ini awalnya dibuat di platform Emergent. Backend sudah dimodifikasi supaya bisa
di-deploy mandiri (pakai API key OpenAI sendiri + penyimpanan file lokal, tanpa
tergantung layanan Emergent).

## 1. Jalankan Backend (lokal, untuk development)

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# lalu edit .env: isi MONGO_URL, DB_NAME, dan OCR_SPACE_API_KEY (gratis di ocr.space/ocrapi/freekey)
```

Butuh MongoDB jalan lokal (`mongod`) atau pakai MongoDB Atlas (gratis, cloud) dan
tempel connection string-nya ke `MONGO_URL` di `.env`.

Jalankan servernya:
```bash
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

Cek di browser: `http://localhost:8000/api/` harus muncul `{"message": "Easy Expense API", "status": "ok"}`.

## 2. Deploy Backend ke Server/Cloud

### Opsi A — VPS sendiri (Docker, paling fleksibel)
1. Punya VPS (DigitalOcean, Contabo, dll) dengan Docker & Docker Compose terpasang.
2. Clone/upload project ini ke VPS.
3. `cd backend && cp .env.example .env` lalu isi `OCR_SPACE_API_KEY` (biarkan `MONGO_URL` default, akan dioverride oleh docker-compose).
4. Dari root project: `docker compose up -d --build`
5. Backend jalan di `http://<ip-vps>:8000`. Untuk domain + HTTPS, pasang reverse proxy (Caddy/Nginx) di depan port 8000.

### Opsi B — Platform PaaS (Railway / Render, tanpa urus server)
1. Push project ke GitHub.
2. Di Railway/Render, buat service baru dari folder `backend` (mereka akan otomatis pakai `Dockerfile`).
3. Set environment variables: `MONGO_URL` (pakai MongoDB Atlas gratis), `DB_NAME`, `OCR_SPACE_API_KEY`.
4. **Penting**: penyimpanan file lokal (`backend/uploads`) akan hilang setiap redeploy di platform tanpa persistent disk — pastikan aktifkan "persistent volume/disk" di pengaturan service, mount ke `/app/uploads`.
5. Setelah deploy, catat URL publiknya (misal `https://easy-expense-backend.up.railway.app`).

## 3. Jalankan Frontend via Expo Go (testing cepat di HP Android)

1. Install app **Expo Go** dari Play Store di HP Android.
2. Di komputer:
   ```bash
   cd frontend
   cp .env.example .env
   # isi EXPO_PUBLIC_BACKEND_URL dengan URL backend (dari langkah 2, atau http://<ip-lokal-laptop>:8000 kalau testing di WiFi yang sama)
   yarn install   # atau npm install
   npx expo start
   ```
3. Scan QR code yang muncul di terminal pakai app Expo Go di HP.
4. Aplikasi akan terbuka di HP dan langsung terhubung ke backend yang sudah dideploy.

> Kalau backend masih di localhost laptop (bukan cloud) dan HP terhubung WiFi yang sama,
> pakai `http://<ip-lokal-laptop>:8000` (cek IP dengan `ipconfig`/`ifconfig`), bukan `localhost`.

## 4. Build APK Standalone (setelah testing via Expo Go sukses)

```bash
cd frontend
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android --profile preview
```
Setelah build selesai (~10-15 menit di server EAS), akan ada link download APK yang bisa
langsung di-install di HP Android manapun.

## Struktur Project
- `frontend/` — Expo Router app (Beranda, Pengeluaran, Scan, Laporan, Proyek)
- `backend/` — FastAPI (routes di bawah `/api`), PDF report via reportlab
- `memory/PRD.md` — dokumentasi produk & fitur

## Environment Variables

**backend/.env**
| Var | Keterangan |
|---|---|
| `MONGO_URL` | Connection string MongoDB |
| `DB_NAME` | Nama database |
| `OCR_SPACE_API_KEY` | API key gratis dari [ocr.space/ocrapi/freekey](https://ocr.space/ocrapi/freekey) (tanpa kartu kredit) — dipakai untuk baca teks struk. Kuota gratis besar untuk pemakaian pribadi. |

Setelah OCR membaca teks struk, backend menebak vendor/nominal/tanggal/kategori pakai
aturan (regex + kata kunci) di `guess_amount`, `guess_date`, `guess_vendor`, `guess_category`
(lihat `backend/server.py`). Tidak sepintar AI berbayar, tapi cukup akurat untuk struk umum,
dan user tetap bisa koreksi manual sebelum simpan.

**frontend/.env**
| Var | Keterangan |
|---|---|
| `EXPO_PUBLIC_BACKEND_URL` | URL backend (tanpa `/api` di akhir) |
