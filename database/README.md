# PostgreSQL Setup

Set environment variables in `.env.local`:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/kandang_ayam"
# Use this only when your hosted PostgreSQL requires SSL.
DATABASE_SSL="false"
```

The production and finance pages create and seed these tables automatically on first database access:

- `produksi_records`
- `finance_transactions`
- `livestock_batches`
- `livestock_vaccinations`
- `inventory_items`

If you want to create the tables manually, run `database/schema.sql` in PostgreSQL.
