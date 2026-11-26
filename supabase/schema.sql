-- ==========================================================================
-- FORMULA 1 QATAR AIRWAYS QATAR GRAND PRIX 2026 — SUPABASE DATABASE SCHEMA
-- Jalankan seluruh script ini di menu "SQL Editor" pada Dashboard Supabase
-- ==========================================================================

-- 1. Buat tabel utama penyimpanan RSVP tamu
create table if not exists public.rsvps (
  id uuid primary key default gen_random_uuid(),
  guest_key text not null unique,
  name text not null check (char_length(btrim(name)) > 0),
  status text not null check (status in ('Hadir', 'Mungkin', 'Tidak Hadir')),
  sessions text[] not null default '{}',
  team text not null default '',
  notes text not null default '',
  pass text not null default '',
  tribun text not null default '',
  updated_at timestamptz not null default now()
);

-- Index untuk pengurutan waktu terbaru
create index if not exists idx_rsvps_updated_at on public.rsvps (updated_at desc);

-- 2. Berikan izin akses tabel ke role anon & authenticated, lalu aktifkan RLS
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.rsvps to anon, authenticated;

alter table public.rsvps enable row level security;

-- Hapus policy lama jika script dijalankan ulang agar tidak duplikat
drop policy if exists "Public can read rsvps" on public.rsvps;
drop policy if exists "Public can insert rsvps" on public.rsvps;
drop policy if exists "Public can update rsvps" on public.rsvps;
drop policy if exists "Organizer can delete rsvps" on public.rsvps;

-- Policy baca publik (untuk menampilkan Statistik Kehadiran Tamu & Rekap Admin)
create policy "Public can read rsvps"
  on public.rsvps
  for select
  to anon, authenticated
  using (true);

-- Policy tambah RSVP baru dari halaman undangan
create policy "Public can insert rsvps"
  on public.rsvps
  for insert
  to anon, authenticated
  with check (
    char_length(btrim(name)) > 0
    and status in ('Hadir', 'Mungkin', 'Tidak Hadir')
  );

-- Policy perbarui RSVP jika tamu yang sama mengubah konfirmasinya (upsert)
create policy "Public can update rsvps"
  on public.rsvps
  for update
  to anon, authenticated
  using (true)
  with check (
    char_length(btrim(name)) > 0
    and status in ('Hadir', 'Mungkin', 'Tidak Hadir')
  );

-- Policy hapus RSVP untuk pengelolaan melalui Panel Admin
create policy "Organizer can delete rsvps"
  on public.rsvps
  for delete
  to anon, authenticated
  using (true);

-- 3. Aktifkan Supabase Realtime agar angka kehadiran ter-update otomatis tanpa refresh
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'rsvps'
  ) then
    alter publication supabase_realtime add table public.rsvps;
  end if;
end $$;
