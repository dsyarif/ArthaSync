-- ========================================================
-- ARTHASYNC SUPABASE DATABASE SCHEMA & REALTIME SETUP
-- Jalankan skrip ini di:
-- 1. Buka Supabase Dashboard (https://supabase.com/dashboard)
-- 2. Pilih Project Anda -> Klik menu "SQL Editor" di bilah kiri
-- 3. Klik "New Query", paste skrip ini, lalu klik "Run" (hijau)
-- ========================================================

-- 1. Tabel Groups (Grup Keluarga & Dompet Pribadi)
CREATE TABLE IF NOT EXISTS public.groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'keluarga',
    currency TEXT NOT NULL DEFAULT 'IDR',
    monthly_budget NUMERIC NOT NULL DEFAULT 0,
    members JSONB NOT NULL DEFAULT '[]'::jsonb,
    assets JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at BIGINT NOT NULL DEFAULT 1,
    is_deleted BOOLEAN NOT NULL DEFAULT false
);

-- 2. Tabel Categories (Kategori Pengeluaran & Pemasukan)
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    color TEXT NOT NULL,
    monthly_budget NUMERIC NOT NULL DEFAULT 0,
    type TEXT NOT NULL DEFAULT 'expense',
    is_default BOOLEAN NOT NULL DEFAULT false,
    updated_at BIGINT NOT NULL DEFAULT 1,
    is_deleted BOOLEAN NOT NULL DEFAULT false
);

-- 3. Tabel Transactions (Catatan Transaksi Keuangan)
CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY,
    amount NUMERIC NOT NULL,
    type TEXT NOT NULL,
    category_id TEXT,
    description TEXT NOT NULL DEFAULT '',
    date TEXT NOT NULL,
    time TEXT NOT NULL DEFAULT '12:00',
    payment_method TEXT NOT NULL DEFAULT 'transfer_bank',
    asset_id TEXT,
    group_id TEXT NOT NULL,
    member_id TEXT NOT NULL,
    receipt_url TEXT,
    is_transfer BOOLEAN NOT NULL DEFAULT false,
    to_asset_id TEXT,
    transfer_pair_id TEXT,
    updated_at BIGINT NOT NULL DEFAULT 1,
    is_deleted BOOLEAN NOT NULL DEFAULT false
);

-- 4. Tabel Debts (Catatan Utang & Piutang)
CREATE TABLE IF NOT EXISTS public.debts (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    type TEXT NOT NULL,
    party_type TEXT NOT NULL DEFAULT 'external',
    scope TEXT DEFAULT 'perorangan',
    is_joint BOOLEAN DEFAULT false,
    member_id TEXT NOT NULL,
    other_member_id TEXT,
    other_person_name TEXT,
    amount NUMERIC NOT NULL DEFAULT 0,
    paid_amount NUMERIC NOT NULL DEFAULT 0,
    due_date TEXT,
    date TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    asset_id TEXT,
    target_asset_id TEXT,
    status TEXT NOT NULL DEFAULT 'unpaid',
    payments JSONB NOT NULL DEFAULT '[]'::jsonb,
    initial_transaction_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at BIGINT NOT NULL DEFAULT 1,
    updated_at BIGINT NOT NULL DEFAULT 1,
    is_deleted BOOLEAN NOT NULL DEFAULT false
);

-- Indexing untuk query cepat
CREATE INDEX IF NOT EXISTS idx_transactions_group_date ON public.transactions (group_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_updated_at ON public.transactions (updated_at);
CREATE INDEX IF NOT EXISTS idx_debts_group ON public.debts (group_id);

-- Aktifkan Row Level Security (RLS) & Berikan Akses Anon
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;

-- Policy agar aplikasi frontend dapat membaca dan menyimpan data via Anon Key
DROP POLICY IF EXISTS "Allow anon all on groups" ON public.groups;
CREATE POLICY "Allow anon all on groups" ON public.groups FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on categories" ON public.categories;
CREATE POLICY "Allow anon all on categories" ON public.categories FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on transactions" ON public.transactions;
CREATE POLICY "Allow anon all on transactions" ON public.transactions FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on debts" ON public.debts;
CREATE POLICY "Allow anon all on debts" ON public.debts FOR ALL TO anon USING (true) WITH CHECK (true);

-- Aktifkan Supabase Realtime Publication untuk sinkronisasi otomatis multi-device
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'groups'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.groups;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'categories'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'transactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'debts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.debts;
  END IF;
END $$;
