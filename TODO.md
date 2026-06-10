# TODO - Render Finance < 15 detik

- [ ] Analisis titik bottleneck di `lib/finance-db.ts` untuk `/finance`
- [x] Implement cache TTL hasil `getFinanceTransactions()` (TTL 30 detik)
- [x] Percepat PostgreSQL rebuild: ganti upsert per-row jadi bulk `INSERT ... VALUES ... ON CONFLICT (id) DO UPDATE`


- [ ] Pastikan SQLite path tetap benar dan tidak makin lambat
- [ ] (Opsional) cek index di `database/ADD_INDEXES.sql` terkait finance tables
- [ ] Jalankan `scripts/test-finance-performance.ts` untuk validasi waktu (kemungkinan butuh adjustment import/ESM)


