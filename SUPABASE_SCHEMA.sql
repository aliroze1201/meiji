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

-- =====================================================================
-- ÉTAPE 2 : reste des modules (employés, chèques, banque, mobile,
-- fournisseurs, catégories, pointage)
-- =====================================================================

create table if not exists meiji_employes (
  id        bigserial primary key,
  nom       text not null,
  poste     text,
  dept      text,
  brut      bigint not null default 0,
  prime     bigint not null default 0,
  avance    bigint not null default 0,
  net       bigint not null default 0,
  created_at timestamptz default now()
);

create table if not exists meiji_cheques (
  id                 bigserial primary key,
  date               date,
  dept               text check (dept in ('SUSHI','BAR','CHICHA')),
  numero             text,
  banque             text,
  tireur             text,
  montant            bigint not null default 0,
  notes              text,
  statut             text not null default 'attente'
                     check (statut in ('attente','depose','encaisse','rejete')),
  date_depot         date,
  date_encaissement  date,
  created_at         timestamptz default now()
);

-- Solde courant pour Banque & Mobile (1 ligne par type)
create table if not exists meiji_solde (
  type      text primary key check (type in ('banque','mobile')),
  montant   bigint not null default 0,
  date_str  text,
  updated_at timestamptz default now()
);

-- Mouvements Banque & Mobile
create table if not exists meiji_mvts (
  id        bigserial primary key,
  type      text not null check (type in ('banque','mobile')),
  date      date,
  lib       text,
  op        text,
  mnt       bigint not null default 0,
  mvt_type  text not null check (mvt_type in ('in','out')),
  ref       text,
  created_at timestamptz default now()
);

create table if not exists meiji_fournisseurs (
  id        bigserial primary key,
  date      date,
  four      text,
  num       text,
  ech       date,
  lib       text,
  deb       bigint not null default 0,
  cred      bigint not null default 0,
  solde     bigint not null default 0,
  obs       text,
  created_at timestamptz default now()
);

create table if not exists meiji_categories (
  id        bigserial primary key,
  nom       text not null,
  type      text not null,
  color     text,
  dept      text,
  desc_text text,
  created_at timestamptz default now()
);

-- Pointage (1 ligne par date)
create table if not exists meiji_pointage (
  date       date primary key,
  compte     bigint,
  ecart      bigint,
  updated_at timestamptz default now()
);

alter table meiji_employes      enable row level security;
alter table meiji_cheques       enable row level security;
alter table meiji_solde         enable row level security;
alter table meiji_mvts          enable row level security;
alter table meiji_fournisseurs  enable row level security;
alter table meiji_categories    enable row level security;
alter table meiji_pointage      enable row level security;

drop policy if exists "auth_full_employes"     on meiji_employes;
drop policy if exists "auth_full_cheques"      on meiji_cheques;
drop policy if exists "auth_full_solde"        on meiji_solde;
drop policy if exists "auth_full_mvts"         on meiji_mvts;
drop policy if exists "auth_full_fournisseurs" on meiji_fournisseurs;
drop policy if exists "auth_full_categories"   on meiji_categories;
drop policy if exists "auth_full_pointage"     on meiji_pointage;

create policy "auth_full_employes"     on meiji_employes     for all to authenticated using (true) with check (true);
create policy "auth_full_cheques"      on meiji_cheques      for all to authenticated using (true) with check (true);
create policy "auth_full_solde"        on meiji_solde        for all to authenticated using (true) with check (true);
create policy "auth_full_mvts"         on meiji_mvts         for all to authenticated using (true) with check (true);
create policy "auth_full_fournisseurs" on meiji_fournisseurs for all to authenticated using (true) with check (true);
create policy "auth_full_categories"   on meiji_categories   for all to authenticated using (true) with check (true);
create policy "auth_full_pointage"     on meiji_pointage     for all to authenticated using (true) with check (true);
