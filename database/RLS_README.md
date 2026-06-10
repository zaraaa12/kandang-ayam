# Panduan Setup RLS di Supabase

## Masalah: `relation "public.produksi" does not exist`

Tabel yang benar adalah **`produksi_records`** (bukan `produksi`). File RLS_SETUP.sql sudah direvisi.

## Langkah-Langkah Setup

### 1. Verifikasi Tabel Sudah Ada
- Buka **Supabase Dashboard** → **SQL Editor**
- Buat **New Query** dan paste isi dari `database/RLS_DIAGNOSTIC.sql`
- **Run** query
- Pastikan output menunjukkan 8 tabel:
  - `users`
  - `inventory_items`
  - `livestock_batches`
  - `livestock_vaccinations`
  - `produksi_records` ✅ (bukan produksi)
  - `finance_income`
  - `finance_expense`
  - `finance_warist`

Jika ada yang hilang, jalankan `database/schema.sql` terlebih dahulu.

### 2. Enable RLS dan Buat Policies
- Kembali ke **SQL Editor** → **New Query**
- Paste isi dari `database/RLS_SETUP.sql`
- **Run** query

Script akan:
1. Enable RLS pada 8 tabel
2. Drop existing policies (jika ada dari run sebelumnya)
3. Create policy baru untuk semua authenticated user (full access: SELECT/INSERT/UPDATE/DELETE)

**✅ Script ini AMAN dijalankan berkali-kali** — tidak perlu khawatir ada error "already exists"

### 3. Verifikasi Setup Berhasil
- Jalankan lagi `database/RLS_DIAGNOSTIC.sql`
- Pastikan:
  - RLS Enabled: semua TRUE
  - Policies: 8 policies sudah tercipta (satu per tabel)

## Catatan Penting

- ✅ **Untuk Next.js server-side code**: Gunakan `process.env.DATABASE_URL` (service_role), RLS tidak berlaku
- ✅ **Untuk client-side queries**: Gunakan `supabase-js` dengan JWT token, RLS akan berlaku
- ✅ **Semua user terautentikasi** memiliki akses penuh (SELECT/INSERT/UPDATE/DELETE)

## File-File

| File | Tujuan |
|------|--------|
| `database/schema.sql` | Buat tabel (jalankan jika belum ada) |
| `database/RLS_DIAGNOSTIC.sql` | Verifikasi tabel dan RLS status |
| `database/RLS_SETUP.sql` | Enable RLS dan buat policies (JALANKAN INI) |

## Troubleshooting

### Error: "relation "public.xxx" does not exist"
- Pastikan nama tabel PERSIS seperti di schema.sql
- Gunakan query diagnostic untuk cek nama tabel yang ada

### Error: "permission denied for schema public"
- Gunakan akun dengan role `postgres` atau `authenticated` role dengan hak DDL

### Policies tidak bekerja untuk server-side code
- Normal! Server-side pakai service_role key yang bypass RLS
- Hanya client-side queries (via supabase-js) yang terikat RLS

