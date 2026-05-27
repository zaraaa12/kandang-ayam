create table if not exists produksi_records (
  id text primary key,
  record_date date not null,
  month text not null,
  act integer not null check (act >= 0),
  vol numeric(10, 2) not null check (vol >= 0),
  ayam integer not null check (ayam > 0),
  hdp numeric(6, 2) not null check (hdp >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists finance_transactions (
  id text primary key,
  no text not null unique,
  type text not null check (type in ('sale', 'expense')),
  tx_date date not null,
  category text not null,
  buyer text not null default '',
  vol numeric(10, 2) not null default 0 check (vol >= 0),
  jumlah integer not null check (jumlah >= 0),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists livestock_batches (
  id text primary key,
  masuk date not null,
  jumlah integer not null check (jumlah > 0),
  tahun integer not null default 0 check (tahun >= 0),
  bulan integer not null default 0 check (bulan >= 0),
  hari integer not null default 0 check (hari >= 0),
  status text not null check (status in ('active', 'partial', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists livestock_vaccinations (
  no integer primary key,
  tanggal date not null,
  nama text not null,
  qty integer not null check (qty > 0),
  satuan text not null,
  harga integer not null default 0 check (harga >= 0),
  subtotal integer not null check (subtotal >= 0),
  batch text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists inventory_items (
  id text primary key,
  nama text not null,
  kategori text not null check (kategori in ('Feed', 'Medical', 'Parts', 'Cleaning', 'Utility')),
  stok integer not null check (stok >= 0),
  satuan text not null,
  kapasitas integer not null check (kapasitas > 0),
  harga_satuan integer not null check (harga_satuan >= 0),
  terakhir_restock date not null,
  keterangan text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Users table for authentication
create table if not exists users (
  id serial primary key,
  username text not null unique,
  password text not null,
  name text not null,
  role text not null check (role in ('Admin', 'Karyawan', 'Farm Manager')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Insert default users (passwords are plain text for now - should be hashed in production)
INSERT INTO users (username, password, name, role, is_active) 
VALUES 
  ('admin', 'kandang2025', 'Admin Kandang', 'Admin', true),
  ('warist', 'warist123', 'Warist', 'Karyawan', true),
  ('manager', 'manager2025', 'Farm Manager', 'Farm Manager', true)
ON CONFLICT (username) DO NOTHING;
