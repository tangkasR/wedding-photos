# 💍 Wedding Photo Sharing App

Modern wedding photo sharing — built with Next.js 16, mysql2, Tailwind CSS v4.

## 🚀 Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env — set DATABASE_URL and couple names
```

### 3. Setup database
```bash
# Option A — auto script (recommended)
node scripts/setup-db.js

# Option B — manual, paste database/setup.sql into HeidiSQL/phpMyAdmin
```

### 4. Create storage folder
```bash
mkdir -p storage/uploads/photos
```

### 5. Run
```bash
npm run dev
```

Open http://localhost:3000

---

## ⚙️ Environment Variables (.env)

```env
# Laragon / local MySQL (no password)
DATABASE_URL="mysql://root@localhost:3306/wedding_photos"

# With password
DATABASE_URL="mysql://root:yourpassword@localhost:3306/wedding_photos"

# Couple info shown on site
NEXT_PUBLIC_COUPLE_NAMES="Sarah & James"
NEXT_PUBLIC_WEDDING_DATE="June 14, 2025"

# Storage path
STORAGE_BASE_PATH="./storage/uploads/photos"
```

---

## 📁 Project Structure

```
wedding-photos/
├── src/
│   ├── app/
│   │   ├── api/photos/
│   │   │   ├── upload/route.ts       ← Streaming upload (busboy)
│   │   │   ├── gallery/route.ts      ← Paginated gallery API
│   │   │   └── file/[filename]/      ← File serve + thumbnail
│   │   ├── page.tsx                  ← Main page
│   │   └── globals.css               ← Tailwind v4 + wedding theme
│   ├── components/
│   │   ├── UploadZone.tsx            ← Drag & drop upload UI
│   │   └── PhotoGallery.tsx          ← Masonry gallery + lightbox
│   └── lib/
│       ├── db.ts                     ← mysql2 database layer
│       ├── storage.ts                ← Filesystem utilities
│       └── rate-limit.ts             ← IP rate limiter
├── scripts/
│   └── setup-db.js                   ← Creates DB tables
├── database/
│   └── setup.sql                     ← Manual SQL reference
├── storage/uploads/photos/           ← Photo storage (create this!)
├── ecosystem.config.js               ← PM2 production config
└── nginx.conf                        ← Nginx reverse proxy config
```

---

## 🔧 Tech Stack

- **Next.js 16** — App Router, Server Components
- **mysql2** — Direct MySQL connection (no ORM)
- **Tailwind CSS v4** — Utility-first styling
- **busboy** — Streaming multipart upload
- **sharp** — On-the-fly thumbnails (never modifies originals)
- **exifr** — EXIF metadata extraction

---

## 📸 Image Preservation

Every uploaded photo is stored **100% untouched**:
- Streamed directly to disk via busboy (never loaded into memory)
- No compression, no resizing, no format conversion
- SHA-256 checksum verified after write
- Downloads serve the exact original file via `fs.createReadStream`
- Thumbnails generated on-the-fly from original, stored separately in memory only

---

## 🏭 Production (VPS + PM2 + Nginx)

```bash
npm run build
pm2 start ecosystem.config.js
# Setup Nginx with nginx.conf
# SSL: certbot --nginx -d yourdomain.com
```
