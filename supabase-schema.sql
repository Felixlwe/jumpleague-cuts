-- ==============================================================================
-- JUMPLEAGUE SHORTCUTS - SUPABASE SQL SCHEMA
-- Kopiere dieses Skript vollständig in den Supabase SQL Editor und führe es aus.
-- ==============================================================================

-- 1. Tabelle 'cuts' erstellen
create table if not exists public.cuts (
    id text primary key,
    module_id text not null,
    name text not null,
    difficulty text not null check (difficulty in ('SAFE', 'MEDIUM', 'HEAVY', 'PIXEL_PERFECT')),
    time_saved numeric not null default 0,
    consistency integer not null default 3 check (consistency between 1 and 5),
    techs jsonb not null default '[]'::jsonb,
    start_block jsonb not null,
    end_block jsonb not null,
    mid_block jsonb,
    camera_position jsonb not null,
    camera_target jsonb not null,
    video_url text not null default '',
    instructions text not null default '',
    author text not null default 'Community',
    status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED')),
    created_at timestamptz not null default now()
);

-- 2. Performance-Indizes für schnelle Lookups
create index if not exists idx_cuts_module_id on public.cuts(module_id);
create index if not exists idx_cuts_status on public.cuts(status);
create index if not exists idx_cuts_created_at on public.cuts(created_at desc);

-- 3. Row Level Security (RLS) aktivieren
alter table public.cuts enable row level security;

-- Vorhandene Policies sicherheitshalber aufräumen
drop policy if exists "Jeder darf Cuts lesen" on public.cuts;
drop policy if exists "Jeder darf neue Cuts einreichen" on public.cuts;
drop policy if exists "Status-Updates und Review erlauben" on public.cuts;
drop policy if exists "Cuts löschen erlauben" on public.cuts;

-- Policy 1: Alle Besucher können Cuts lesen (SELECT)
create policy "Jeder darf Cuts lesen"
    on public.cuts
    for select
    using (true);

-- Policy 2: Jeder Besucher darf neue Cuts einreichen (INSERT mit Default 'PENDING')
create policy "Jeder darf neue Cuts einreichen"
    on public.cuts
    for insert
    with check (status = 'PENDING');

-- Policy 3: Updates erlauben (für Admin-Review: APPROVED / REJECTED oder Bearbeitungen)
create policy "Status-Updates und Review erlauben"
    on public.cuts
    for update
    using (true)
    with check (true);

-- Policy 4: Löschen erlauben (für Admin-Bereinigung)
create policy "Cuts löschen erlauben"
    on public.cuts
    for delete
    using (true);

-- 4. Realtime aktivieren (optional, falls Live-Updates gewünscht)
alter publication supabase_realtime add table public.cuts;

-- ==============================================================================
-- 5. Tabelle 'modules' erstellen
-- ==============================================================================
create table if not exists public.modules (
    id text primary key,
    short_code text not null,
    name text not null,
    difficulty text not null check (difficulty in ('EASY', 'MEDIUM', 'HARD', 'ULTRA')),
    blocks jsonb not null default '[]'::jsonb,
    spawn_point jsonb,
    finish_point jsonb,
    is_deleted boolean not null default false,
    created_at timestamptz not null default now()
);

-- Performance-Indizes für schnelle Lookups
create index if not exists idx_modules_difficulty on public.modules(difficulty);
create index if not exists idx_modules_is_deleted on public.modules(is_deleted);
create index if not exists idx_modules_created_at on public.modules(created_at desc);

-- Row Level Security (RLS) aktivieren
alter table public.modules enable row level security;

-- Vorhandene Policies sicherheitshalber aufräumen
drop policy if exists "Jeder darf Module lesen" on public.modules;
drop policy if exists "Module anlegen erlauben" on public.modules;
drop policy if exists "Module aktualisieren erlauben" on public.modules;
drop policy if exists "Module löschen erlauben" on public.modules;

-- Policy 1: Alle Besucher können aktive Module lesen (SELECT)
create policy "Jeder darf Module lesen"
    on public.modules
    for select
    using (true);

-- Policy 2: Modul-Erstellung erlauben
create policy "Module anlegen erlauben"
    on public.modules
    for insert
    with check (true);

-- Policy 3: Modul-Updates erlauben
create policy "Module aktualisieren erlauben"
    on public.modules
    for update
    using (true)
    with check (true);

-- Policy 4: Modul-Löschung erlauben
create policy "Module löschen erlauben"
    on public.modules
    for delete
    using (true);

-- Realtime aktivieren für modules
alter publication supabase_realtime add table public.modules;

