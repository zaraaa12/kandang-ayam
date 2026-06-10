# Database Setup Guide — Supabase PostgreSQL

Panduan lengkap untuk menghubungkan aplikasi **kandang-ayam** ke database Supabase PostgreSQL.

---

## 📋 Prerequisites

1. **Akun Supabase** — Daftar di [supabase.com](https://supabase.com)
2. **Project Supabase** — Buat project baru di dashboard Supabase
3. **Node.js & npm** — Sudah terinstall di sistem

---

## 🚀 Langkah Setup

### 1. Dapatkan Kredensial Supabase

#### a. Project URL
- Buka [Supabase Dashboard](https://app.supabase.com)
- Pilih project Anda
- Pergi ke **Settings** → **API**
- Salin **Project URL** (format: `https://xxxxx.supabase.co`)

#### b. Anon/Public Key
- Di halaman yang sama (**Settings** → **API**)
- Salin **anon public** key

#### c. Database Connection String
- Pergi ke **Settings** → **Database**
- Scroll ke **Connection string**
- Pilih tab **URI**
- Salin connection string (format: `postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres`)

---

### 2. Konfigurasi Environment Variables

Edit file `.env.local` di root project:

```bash
# Supabase REST API (untuk client-side)
NEXT_PUBLIC_SUPABASE_URL=https://akfmhqwnnfnkcvogazog.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Supabase PostgreSQL Connection (untuk server-side)
DATABASE_URL=postgresql://postgres:bilqiszahra12@db.akfmhqwnnfnkcvogazog.supabase.co:5432/postgres
DATABASE_SSL=true
```
**PENTING:**
- Ganti `[YOUR-DATABASE-PASSWORD]` dengan password database Anda
- Jangan commit `.env.local` ke Git (sudah ada di `.gitignore`)

---

### 3. Inisialisasi Database

Jalankan script inisialisasi untuk membuat semua tabel:

```bash
npm run init-db
```

Script ini akan:
- Menguji koneksi ke database
- Membuat tabel-tabel yang diperlukan:
  - `produksi_records` — Data produksi telur harian
  - `finance_income` - Data pemasukan finance
  - `finance_expense` - Data pengeluaran finance
  - `finance_warist` - Dana terpisah Warist
  - `livestock_batches` — Batch kandang ayam
  - `livestock_vaccinations` — Riwayat vaksinasi
  - `inventory_items` — Item inventory

---

### 4. Jalankan Aplikasi

```bash
npm run dev
```

Aplikasi akan:
- Terhubung ke database Supabase
- Secara otomatis seed data awal jika tabel kosong
- Menyimpan semua perubahan ke database

---

## 🔍 Verifikasi Koneksi

### Cara 1: Lihat Log Console
Saat menjalankan `npm run dev`, perhatikan log di terminal. Jika berhasil terhubung, akan muncul:
```
Database tables initialized successfully
```

### Cara 2: Jalankan Manual
```bash
npm run init-db
```

Output yang diharapkan:
```
🚀 Starting database initialization...
📡 Testing database connection...
✅ Database connection successful!
📋 Initializing database tables...
✅ Database tables created successfully!
   - produksi_records
   - finance_income
   - finance_expense
   - finance_warist
   - livestock_batches
   - livestock_vaccinations
   - inventory_items
🎉 Database initialization complete!
```

### Cara 3: Cek di Supabase Dashboard
- Buka [Supabase Dashboard](https://app.supabase.com)
- Pilih project Anda
- Pergi ke **Table Editor**
- Anda akan melihat tabel-tabel aplikasi yang telah dibuat

---

## 🛠️ Troubleshooting

### Error: "DATABASE_URL belum dikonfigurasi"
**Solusi:** Pastikan `.env.local` sudah dikonfigurasi dengan benar dan restart development server.

### Error: "Connection refused" atau "Timeout"
**Solusi:**
1. Periksa kembali `DATABASE_URL` di `.env.local`
2. Pastikan password database benar
3. Cek firewall/network yang mungkin memblokir koneksi

### Error: "SSL connection failed"
**Solusi:** Pastikan `DATABASE_SSL=true` ada di `.env.local`

### Tabel tidak ter-seed dengan data awal
**Solusi:** Aplikasi akan otomatis seed data saat pertama kali mengakses fitur yang bersangkutan. Atau jalankan ulang server setelah inisialisasi.

---

## 📊 Struktur Database

### `produksi_records`
Data produksi telur harian.

| Column | Type | Description |
|--------|------|-------------|
| id | text | Primary key (UUID) |
| record_date | date | Tanggal record |
| month | text | Nama bulan |
| act | integer | Jumlah telur (butir) |
| vol | numeric | Volume (kg) |
| ayam | integer | Jumlah ayam |
| hdp | numeric | Hen Day Production (%) |

### `finance_income`, `finance_expense`, `finance_warist`
Transaksi keuangan dipisah per jenis data.

| Column | Type | Description |
|--------|------|-------------|
| id | text | Primary key (UUID) |
| no | text | Nomor transaksi (unique) |
| type | text | `income`, `expense`, atau `warist` sesuai tabel |
| tx_date | date | Tanggal transaksi |
| category | text | Kategori |
| buyer | text | Pembeli/supplier |
| stock | numeric | Stok telur (opsional) |
| vol | numeric | Volume |
| sisa | numeric | Sisa stok (opsional) |
| harga | integer | Harga per unit (opsional) |
| jumlah | integer | Jumlah (Rp) |
| notes | text | Catatan |

### `livestock_batches`
Batch kandang ayam.

| Column | Type | Description |
|--------|------|-------------|
| id | text | Primary key (format: BTH-XXX) |
| masuk | date | Tanggal masuk |
| jumlah | integer | Jumlah ayam |
| tahun | integer | Umur (tahun) |
| bulan | integer | Umur (bulan) |
| hari | integer | Umur (hari) |
| status | text | 'active', 'partial', atau 'closed' |

### `livestock_vaccinations`
Riwayat vaksinasi.

| Column | Type | Description |
|--------|------|-------------|
| no | integer | Primary key (auto increment) |
| tanggal | date | Tanggal vaksinasi |
| nama | text | Nama vaksin |
| qty | integer | Jumlah |
| satuan | text | Satuan |
| harga | integer | Harga per unit (Rp) |
| subtotal | integer | Total (Rp) |
| batch | text | ID batch |

### `inventory_items`
Item inventory (pakan, obat, peralatan).

| Column | Type | Description |
|--------|------|-------------|
| id | text | Primary key (UUID) |
| nama | text | Nama item |
| kategori | text | Kategori (Feed, Medical, Parts, Cleaning, Utility) |
| stok | integer | Stok saat ini |
| satuan | text | Satuan |
| kapasitas | integer | Kapasitas maksimal |
| harga_satuan | integer | Harga per unit (Rp) |
| terakhir_restock | date | Tanggal restock terakhir |
| keterangan | text | Keterangan |

---

## 🔄 Migrasi Data

Jika Anda ingin migrasi data dari sistem lama:

1. Export data dari sistem lama ke format CSV/JSON
2. Buat script migrasi custom di `scripts/migrate-*.ts`
3. Jalankan script migrasi: `npx tsx scripts/migrate-*.ts`

---

## 🔐 Keamanan

### Best Practices:
1. **Jangan commit `.env.local`** — Sudah ada di `.gitignore`
2. **Gunakan Row Level Security (RLS)** — Aktifkan di Supabase Dashboard
3. **Batasi akses database** — Gunakan service role key hanya di server
4. **Backup rutin** — Supabase menyediakan automatic backups

### Mengaktifkan RLS:
```sql
-- Contoh untuk tabel production_records
ALTER TABLE produksi_records ENABLE ROW LEVEL SECURITY;

-- Buat policy untuk mengizinkan akses
CREATE POLICY "Allow all operations" ON produksi_records
FOR ALL USING (true) WITH CHECK (true);
```

---

## 📚 Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [pg library documentation](https://github.com/brianc/node-postgres)

---

## 🆘 Butuh Bantuan?

Jika mengalami masalah:
1. Cek log error di terminal
2. Periksa konfigurasi `.env.local`
3. Test koneksi manual dengan `psql` atau pgAdmin
4. Baca [Supabase Community](https://github.com/supabase/supabase/discussions)

---

**Last Updated:** Mei 2026
