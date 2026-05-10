-- =====================================================================
-- MEIJI — Schéma Supabase pour stockage cloud des données métier
-- À exécuter UNE FOIS dans Supabase → SQL Editor → New query → Run
-- =====================================================================

-- ========== JOURNÉES ==========
create table if not exists meiji_journees (
  id          bigserial primary key,
  date        date not null unique,
  s_esp       bigint not null default 0,
  s_chq       bigint not null default 0,
  s_mob       bigint not null default 0,
  s_cred      bigint not null default 0,
  b_esp       bigint not null default 0,
  b_chq       bigint not null default 0,
  b_mob       bigint not null default 0,
  b_cred      bigint not null default 0,
  c_esp       bigint not null default 0,
  c_chq       bigint not null default 0,
  c_mob       bigint not null default 0,
  c_cred      bigint not null default 0,
  ds          bigint not null default 0,
  db          bigint not null default 0,
  dc          bigint not null default 0,
  cs          bigint not null default 0,
  cb          bigint not null default 0,
  cc          bigint not null default 0,
  deps        jsonb  not null default '{"s":[],"b":[],"c":[]}'::jsonb,
  updated_at  timestamptz default now()
);

-- ========== DÉPENSES libres (saisies via la page Dépenses) ==========
create table if not exists meiji_depenses (
  id          bigserial primary key,
  date        date not null,
  dept        text not null check (dept in ('SUSHI','BAR','CHICHA')),
  label       text,
  groupe      text,
  qte         numeric,
  prix        numeric,
  montant     bigint not null,
  observation text,
  created_at  timestamptz default now()
);

-- ========== CRÉDITS clients ==========
create table if not exists meiji_credits (
  id          bigserial primary key,
  date        date not null,
  ticket      text,
  client      text not null,
  dept        text not null check (dept in ('SUSHI','BAR','CHICHA')),
  montant     bigint not null,
  statut      text not null default 'ouvert' check (statut in ('ouvert','regle')),
  date_reg    date,
  mode_reg    text,
  created_at  timestamptz default now()
);

-- ========== RLS : toute l'équipe authentifiée a accès complet ==========
alter table meiji_journees enable row level security;
alter table meiji_depenses enable row level security;
alter table meiji_credits  enable row level security;

drop policy if exists "auth_full_journees" on meiji_journees;
drop policy if exists "auth_full_depenses" on meiji_depenses;
drop policy if exists "auth_full_credits"  on meiji_credits;

create policy "auth_full_journees" on meiji_journees for all to authenticated using (true) with check (true);
create policy "auth_full_depenses" on meiji_depenses for all to authenticated using (true) with check (true);
create policy "auth_full_credits"  on meiji_credits  for all to authenticated using (true) with check (true);
