-- ==========================================================================
-- FORMULA 1 QATAR AIRWAYS QATAR GRAND PRIX 2026 — SKEMA DATABASE SUPABASE
-- Jalankan seluruh script ini di menu "SQL Editor" pada Dashboard Supabase
-- untuk membuat tabel penyimpanan RSVP tamu, izin akses, dan fitur Realtime.
-- ==========================================================================

-- 1. Buat tabel utama public.rsvps untuk menampung konfirmasi kehadiran & buku tamu
--    - id         : Pengenal unik otomatis (UUID) per baris
--    - guest_key  : Nama tamu huruf kecil (unique) agar nama sama melakukan update, bukan duplikat
--    - name       : Nama lengkap tamu (wajib terisi / tidak boleh kosong)
--    - status     : Pilihan dibatasi hanya 'Hadir', 'Mungkin', atau 'Tidak Hadir'
--    - sessions   : Array teks daftar sesi F1 yang dipilih (FP1, FP2, FP3, Qualifying, Race)
--    - team       : Konstruktor F1 dukungan tamu
--    - notes      : Ucapan / doa / catatan hospitality untuk ditampilkan di Buku Tamu
--    - pass/tribun: Informasi kategori pass dan zona tempat duduk tamu
--    - updated_at : Waktu pengiriman / pembaruan RSVP terakhir
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

-- Index pada updated_at (descending) agar urutan buku tamu & rekap selalu dari yang terbaru
create index if not exists idx_rsvps_updated_at on public.rsvps (updated_at desc);

-- 2. Berikan izin (GRANT) akses tabel ke role anon (pengunjung web) & authenticated, lalu aktifkan RLS
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.rsvps to anon, authenticated;

-- Row Level Security (RLS) memastikan akses tabel dikontrol secara eksplisit lewat policy
alter table public.rsvps enable row level security;

-- Hapus policy lama terlebih dahulu jika script dijalankan ulang agar tidak terjadi error duplikasi
drop policy if exists "Public can read rsvps" on public.rsvps;
drop policy if exists "Public can insert rsvps" on public.rsvps;
drop policy if exists "Public can update rsvps" on public.rsvps;
drop policy if exists "Organizer can delete rsvps" on public.rsvps;

-- Policy SELECT: Mengizinkan semua pengunjung melihat statistik kehadiran & buku tamu
create policy "Public can read rsvps"
  on public.rsvps
  for select
  to anon, authenticated
  using (true);

-- Policy INSERT: Mengizinkan tamu mengirim konfirmasi baru dengan validasi nama & status
create policy "Public can insert rsvps"
  on public.rsvps
  for insert
  to anon, authenticated
  with check (
    char_length(btrim(name)) > 0
    and status in ('Hadir', 'Mungkin', 'Tidak Hadir')
  );

-- Policy UPDATE: Mengizinkan tamu memperbarui pilihan jika mengirim ulang dengan nama sama (upsert)
create policy "Public can update rsvps"
  on public.rsvps
  for update
  to anon, authenticated
  using (true)
  with check (
    char_length(btrim(name)) > 0
    and status in ('Hadir', 'Mungkin', 'Tidak Hadir')
  );

-- Policy DELETE: Mengizinkan Panel Admin menghapus baris RSVP tertentu atau membersihkan rekap
create policy "Organizer can delete rsvps"
  on public.rsvps
  for delete
  to anon, authenticated
  using (true);

-- 3. Daftarkan tabel public.rsvps ke publikasi Realtime agar statistik di layar langsung update otomatis
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
