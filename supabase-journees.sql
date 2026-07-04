-- ============================================================
-- MEIJI - Migration journées vers Supabase
-- À exécuter UNE FOIS dans Supabase SQL Editor.
-- ============================================================

-- 1) SCHÉMA
CREATE TABLE IF NOT EXISTS public.journees (
  date DATE PRIMARY KEY,
  s_esp BIGINT NOT NULL DEFAULT 0, s_chq BIGINT NOT NULL DEFAULT 0, s_mob BIGINT NOT NULL DEFAULT 0, s_cred BIGINT NOT NULL DEFAULT 0,
  b_esp BIGINT NOT NULL DEFAULT 0, b_chq BIGINT NOT NULL DEFAULT 0, b_mob BIGINT NOT NULL DEFAULT 0, b_cred BIGINT NOT NULL DEFAULT 0,
  c_esp BIGINT NOT NULL DEFAULT 0, c_chq BIGINT NOT NULL DEFAULT 0, c_mob BIGINT NOT NULL DEFAULT 0, c_cred BIGINT NOT NULL DEFAULT 0,
  ds BIGINT NOT NULL DEFAULT 0, db BIGINT NOT NULL DEFAULT 0, dc BIGINT NOT NULL DEFAULT 0,
  cs BIGINT NOT NULL DEFAULT 0, cb BIGINT NOT NULL DEFAULT 0, cc BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users
);

CREATE TABLE IF NOT EXISTS public.journee_deps (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL REFERENCES public.journees(date) ON DELETE CASCADE,
  service CHAR(1) NOT NULL CHECK (service IN ('s','b','c')),
  label TEXT NOT NULL,
  montant BIGINT NOT NULL DEFAULT 0,
  groupe TEXT,
  position INT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS journee_deps_date_idx ON public.journee_deps(date);

-- 2) RLS — définie dans supabase-tables.sql (+ durcissement dans
--    supabase-securite.sql). Plus de policies ici : ce fichier ne doit
--    pas pouvoir rouvrir un accès large en étant relancé.
ALTER TABLE public.journees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journee_deps ENABLE ROW LEVEL SECURITY;

-- 3) IMPORT INITIAL — journées avril+mai 2026
BEGIN;

INSERT INTO public.journees (date,s_esp,s_chq,s_mob,s_cred,b_esp,b_chq,b_mob,b_cred,c_esp,c_chq,c_mob,c_cred,ds,db,dc,cs,cb,cc) VALUES ('2026-04-19',5646000,0,93500,0,1692000,0,0,0,1090000,0,0,0,5235574,490100,0,410426,1201900,1090000) ON CONFLICT (date) DO UPDATE SET s_esp=EXCLUDED.s_esp,s_chq=EXCLUDED.s_chq,s_mob=EXCLUDED.s_mob,s_cred=EXCLUDED.s_cred,b_esp=EXCLUDED.b_esp,b_chq=EXCLUDED.b_chq,b_mob=EXCLUDED.b_mob,b_cred=EXCLUDED.b_cred,c_esp=EXCLUDED.c_esp,c_chq=EXCLUDED.c_chq,c_mob=EXCLUDED.c_mob,c_cred=EXCLUDED.c_cred,ds=EXCLUDED.ds,db=EXCLUDED.db,dc=EXCLUDED.dc,cs=EXCLUDED.cs,cb=EXCLUDED.cb,cc=EXCLUDED.cc,updated_at=now();
INSERT INTO public.journees (date,s_esp,s_chq,s_mob,s_cred,b_esp,b_chq,b_mob,b_cred,c_esp,c_chq,c_mob,c_cred,ds,db,dc,cs,cb,cc) VALUES ('2026-04-21',822500,0,0,0,181000,0,0,0,60000,0,0,0,407998,334436,0,824928,1048464,1150000) ON CONFLICT (date) DO UPDATE SET s_esp=EXCLUDED.s_esp,s_chq=EXCLUDED.s_chq,s_mob=EXCLUDED.s_mob,s_cred=EXCLUDED.s_cred,b_esp=EXCLUDED.b_esp,b_chq=EXCLUDED.b_chq,b_mob=EXCLUDED.b_mob,b_cred=EXCLUDED.b_cred,c_esp=EXCLUDED.c_esp,c_chq=EXCLUDED.c_chq,c_mob=EXCLUDED.c_mob,c_cred=EXCLUDED.c_cred,ds=EXCLUDED.ds,db=EXCLUDED.db,dc=EXCLUDED.dc,cs=EXCLUDED.cs,cb=EXCLUDED.cb,cc=EXCLUDED.cc,updated_at=now();
INSERT INTO public.journees (date,s_esp,s_chq,s_mob,s_cred,b_esp,b_chq,b_mob,b_cred,c_esp,c_chq,c_mob,c_cred,ds,db,dc,cs,cb,cc) VALUES ('2026-04-22',1133500,0,0,0,536000,0,0,0,187500,0,0,0,1215543,141306,0,1133500,536000,187500) ON CONFLICT (date) DO UPDATE SET s_esp=EXCLUDED.s_esp,s_chq=EXCLUDED.s_chq,s_mob=EXCLUDED.s_mob,s_cred=EXCLUDED.s_cred,b_esp=EXCLUDED.b_esp,b_chq=EXCLUDED.b_chq,b_mob=EXCLUDED.b_mob,b_cred=EXCLUDED.b_cred,c_esp=EXCLUDED.c_esp,c_chq=EXCLUDED.c_chq,c_mob=EXCLUDED.c_mob,c_cred=EXCLUDED.c_cred,ds=EXCLUDED.ds,db=EXCLUDED.db,dc=EXCLUDED.dc,cs=EXCLUDED.cs,cb=EXCLUDED.cb,cc=EXCLUDED.cc,updated_at=now();
INSERT INTO public.journees (date,s_esp,s_chq,s_mob,s_cred,b_esp,b_chq,b_mob,b_cred,c_esp,c_chq,c_mob,c_cred,ds,db,dc,cs,cb,cc) VALUES ('2026-04-23',1005500,0,90000,0,284000,0,0,0,75000,0,0,0,359233,717380,0,1095500,284000,75000) ON CONFLICT (date) DO UPDATE SET s_esp=EXCLUDED.s_esp,s_chq=EXCLUDED.s_chq,s_mob=EXCLUDED.s_mob,s_cred=EXCLUDED.s_cred,b_esp=EXCLUDED.b_esp,b_chq=EXCLUDED.b_chq,b_mob=EXCLUDED.b_mob,b_cred=EXCLUDED.b_cred,c_esp=EXCLUDED.c_esp,c_chq=EXCLUDED.c_chq,c_mob=EXCLUDED.c_mob,c_cred=EXCLUDED.c_cred,ds=EXCLUDED.ds,db=EXCLUDED.db,dc=EXCLUDED.dc,cs=EXCLUDED.cs,cb=EXCLUDED.cb,cc=EXCLUDED.cc,updated_at=now();
INSERT INTO public.journees (date,s_esp,s_chq,s_mob,s_cred,b_esp,b_chq,b_mob,b_cred,c_esp,c_chq,c_mob,c_cred,ds,db,dc,cs,cb,cc) VALUES ('2026-04-24',2089950,0,0,0,523400,0,0,0,67500,0,0,0,1167922,178950,0,2089950,523400,67500) ON CONFLICT (date) DO UPDATE SET s_esp=EXCLUDED.s_esp,s_chq=EXCLUDED.s_chq,s_mob=EXCLUDED.s_mob,s_cred=EXCLUDED.s_cred,b_esp=EXCLUDED.b_esp,b_chq=EXCLUDED.b_chq,b_mob=EXCLUDED.b_mob,b_cred=EXCLUDED.b_cred,c_esp=EXCLUDED.c_esp,c_chq=EXCLUDED.c_chq,c_mob=EXCLUDED.c_mob,c_cred=EXCLUDED.c_cred,ds=EXCLUDED.ds,db=EXCLUDED.db,dc=EXCLUDED.dc,cs=EXCLUDED.cs,cb=EXCLUDED.cb,cc=EXCLUDED.cc,updated_at=now();
INSERT INTO public.journees (date,s_esp,s_chq,s_mob,s_cred,b_esp,b_chq,b_mob,b_cred,c_esp,c_chq,c_mob,c_cred,ds,db,dc,cs,cb,cc) VALUES ('2026-04-25',1669000,0,0,0,888400,0,0,0,225000,0,0,0,420777,370803,0,1669000,888400,225000) ON CONFLICT (date) DO UPDATE SET s_esp=EXCLUDED.s_esp,s_chq=EXCLUDED.s_chq,s_mob=EXCLUDED.s_mob,s_cred=EXCLUDED.s_cred,b_esp=EXCLUDED.b_esp,b_chq=EXCLUDED.b_chq,b_mob=EXCLUDED.b_mob,b_cred=EXCLUDED.b_cred,c_esp=EXCLUDED.c_esp,c_chq=EXCLUDED.c_chq,c_mob=EXCLUDED.c_mob,c_cred=EXCLUDED.c_cred,ds=EXCLUDED.ds,db=EXCLUDED.db,dc=EXCLUDED.dc,cs=EXCLUDED.cs,cb=EXCLUDED.cb,cc=EXCLUDED.cc,updated_at=now();
INSERT INTO public.journees (date,s_esp,s_chq,s_mob,s_cred,b_esp,b_chq,b_mob,b_cred,c_esp,c_chq,c_mob,c_cred,ds,db,dc,cs,cb,cc) VALUES ('2026-04-26',1991490,0,0,0,462160,0,0,0,75000,0,0,0,592000,591000,0,1991490,462160,75000) ON CONFLICT (date) DO UPDATE SET s_esp=EXCLUDED.s_esp,s_chq=EXCLUDED.s_chq,s_mob=EXCLUDED.s_mob,s_cred=EXCLUDED.s_cred,b_esp=EXCLUDED.b_esp,b_chq=EXCLUDED.b_chq,b_mob=EXCLUDED.b_mob,b_cred=EXCLUDED.b_cred,c_esp=EXCLUDED.c_esp,c_chq=EXCLUDED.c_chq,c_mob=EXCLUDED.c_mob,c_cred=EXCLUDED.c_cred,ds=EXCLUDED.ds,db=EXCLUDED.db,dc=EXCLUDED.dc,cs=EXCLUDED.cs,cb=EXCLUDED.cb,cc=EXCLUDED.cc,updated_at=now();
INSERT INTO public.journees (date,s_esp,s_chq,s_mob,s_cred,b_esp,b_chq,b_mob,b_cred,c_esp,c_chq,c_mob,c_cred,ds,db,dc,cs,cb,cc) VALUES ('2026-04-28',1056350,0,0,0,411100,0,0,0,120000,0,0,0,1123345,375585,0,1056350,411100,120000) ON CONFLICT (date) DO UPDATE SET s_esp=EXCLUDED.s_esp,s_chq=EXCLUDED.s_chq,s_mob=EXCLUDED.s_mob,s_cred=EXCLUDED.s_cred,b_esp=EXCLUDED.b_esp,b_chq=EXCLUDED.b_chq,b_mob=EXCLUDED.b_mob,b_cred=EXCLUDED.b_cred,c_esp=EXCLUDED.c_esp,c_chq=EXCLUDED.c_chq,c_mob=EXCLUDED.c_mob,c_cred=EXCLUDED.c_cred,ds=EXCLUDED.ds,db=EXCLUDED.db,dc=EXCLUDED.dc,cs=EXCLUDED.cs,cb=EXCLUDED.cb,cc=EXCLUDED.cc,updated_at=now();
INSERT INTO public.journees (date,s_esp,s_chq,s_mob,s_cred,b_esp,b_chq,b_mob,b_cred,c_esp,c_chq,c_mob,c_cred,ds,db,dc,cs,cb,cc) VALUES ('2026-04-29',1189850,0,24000,0,302650,0,0,0,89500,0,0,0,404400,134950,15000,1213850,302650,89500) ON CONFLICT (date) DO UPDATE SET s_esp=EXCLUDED.s_esp,s_chq=EXCLUDED.s_chq,s_mob=EXCLUDED.s_mob,s_cred=EXCLUDED.s_cred,b_esp=EXCLUDED.b_esp,b_chq=EXCLUDED.b_chq,b_mob=EXCLUDED.b_mob,b_cred=EXCLUDED.b_cred,c_esp=EXCLUDED.c_esp,c_chq=EXCLUDED.c_chq,c_mob=EXCLUDED.c_mob,c_cred=EXCLUDED.c_cred,ds=EXCLUDED.ds,db=EXCLUDED.db,dc=EXCLUDED.dc,cs=EXCLUDED.cs,cb=EXCLUDED.cb,cc=EXCLUDED.cc,updated_at=now();
INSERT INTO public.journees (date,s_esp,s_chq,s_mob,s_cred,b_esp,b_chq,b_mob,b_cred,c_esp,c_chq,c_mob,c_cred,ds,db,dc,cs,cb,cc) VALUES ('2026-04-30',1420000,0,0,0,647800,0,0,0,172500,0,0,0,6275239,2004300,0,1420000,647800,172500) ON CONFLICT (date) DO UPDATE SET s_esp=EXCLUDED.s_esp,s_chq=EXCLUDED.s_chq,s_mob=EXCLUDED.s_mob,s_cred=EXCLUDED.s_cred,b_esp=EXCLUDED.b_esp,b_chq=EXCLUDED.b_chq,b_mob=EXCLUDED.b_mob,b_cred=EXCLUDED.b_cred,c_esp=EXCLUDED.c_esp,c_chq=EXCLUDED.c_chq,c_mob=EXCLUDED.c_mob,c_cred=EXCLUDED.c_cred,ds=EXCLUDED.ds,db=EXCLUDED.db,dc=EXCLUDED.dc,cs=EXCLUDED.cs,cb=EXCLUDED.cb,cc=EXCLUDED.cc,updated_at=now();
INSERT INTO public.journees (date,s_esp,s_chq,s_mob,s_cred,b_esp,b_chq,b_mob,b_cred,c_esp,c_chq,c_mob,c_cred,ds,db,dc,cs,cb,cc) VALUES ('2026-05-01',1971850,0,58000,0,642900,0,0,0,180000,0,0,0,301366,160100,0,1612484,482800,180000) ON CONFLICT (date) DO UPDATE SET s_esp=EXCLUDED.s_esp,s_chq=EXCLUDED.s_chq,s_mob=EXCLUDED.s_mob,s_cred=EXCLUDED.s_cred,b_esp=EXCLUDED.b_esp,b_chq=EXCLUDED.b_chq,b_mob=EXCLUDED.b_mob,b_cred=EXCLUDED.b_cred,c_esp=EXCLUDED.c_esp,c_chq=EXCLUDED.c_chq,c_mob=EXCLUDED.c_mob,c_cred=EXCLUDED.c_cred,ds=EXCLUDED.ds,db=EXCLUDED.db,dc=EXCLUDED.dc,cs=EXCLUDED.cs,cb=EXCLUDED.cb,cc=EXCLUDED.cc,updated_at=now();
INSERT INTO public.journees (date,s_esp,s_chq,s_mob,s_cred,b_esp,b_chq,b_mob,b_cred,c_esp,c_chq,c_mob,c_cred,ds,db,dc,cs,cb,cc) VALUES ('2026-05-02',2028620,0,0,0,922000,0,0,0,180000,0,0,0,758400,449760,0,2882704,955040,360000) ON CONFLICT (date) DO UPDATE SET s_esp=EXCLUDED.s_esp,s_chq=EXCLUDED.s_chq,s_mob=EXCLUDED.s_mob,s_cred=EXCLUDED.s_cred,b_esp=EXCLUDED.b_esp,b_chq=EXCLUDED.b_chq,b_mob=EXCLUDED.b_mob,b_cred=EXCLUDED.b_cred,c_esp=EXCLUDED.c_esp,c_chq=EXCLUDED.c_chq,c_mob=EXCLUDED.c_mob,c_cred=EXCLUDED.c_cred,ds=EXCLUDED.ds,db=EXCLUDED.db,dc=EXCLUDED.dc,cs=EXCLUDED.cs,cb=EXCLUDED.cb,cc=EXCLUDED.cc,updated_at=now();
INSERT INTO public.journees (date,s_esp,s_chq,s_mob,s_cred,b_esp,b_chq,b_mob,b_cred,c_esp,c_chq,c_mob,c_cred,ds,db,dc,cs,cb,cc) VALUES ('2026-05-03',1621040,0,0,0,571740,0,8000,0,172500,0,0,0,363873,282500,0,4139871,1236280,532500) ON CONFLICT (date) DO UPDATE SET s_esp=EXCLUDED.s_esp,s_chq=EXCLUDED.s_chq,s_mob=EXCLUDED.s_mob,s_cred=EXCLUDED.s_cred,b_esp=EXCLUDED.b_esp,b_chq=EXCLUDED.b_chq,b_mob=EXCLUDED.b_mob,b_cred=EXCLUDED.b_cred,c_esp=EXCLUDED.c_esp,c_chq=EXCLUDED.c_chq,c_mob=EXCLUDED.c_mob,c_cred=EXCLUDED.c_cred,ds=EXCLUDED.ds,db=EXCLUDED.db,dc=EXCLUDED.dc,cs=EXCLUDED.cs,cb=EXCLUDED.cb,cc=EXCLUDED.cc,updated_at=now();
INSERT INTO public.journees (date,s_esp,s_chq,s_mob,s_cred,b_esp,b_chq,b_mob,b_cred,c_esp,c_chq,c_mob,c_cred,ds,db,dc,cs,cb,cc) VALUES ('2026-05-05',1177500,0,45000,0,499500,0,0,100000,75000,0,0,0,1002500,605000,0,4269871,1030780,607500) ON CONFLICT (date) DO UPDATE SET s_esp=EXCLUDED.s_esp,s_chq=EXCLUDED.s_chq,s_mob=EXCLUDED.s_mob,s_cred=EXCLUDED.s_cred,b_esp=EXCLUDED.b_esp,b_chq=EXCLUDED.b_chq,b_mob=EXCLUDED.b_mob,b_cred=EXCLUDED.b_cred,c_esp=EXCLUDED.c_esp,c_chq=EXCLUDED.c_chq,c_mob=EXCLUDED.c_mob,c_cred=EXCLUDED.c_cred,ds=EXCLUDED.ds,db=EXCLUDED.db,dc=EXCLUDED.dc,cs=EXCLUDED.cs,cb=EXCLUDED.cb,cc=EXCLUDED.cc,updated_at=now();
INSERT INTO public.journees (date,s_esp,s_chq,s_mob,s_cred,b_esp,b_chq,b_mob,b_cred,c_esp,c_chq,c_mob,c_cred,ds,db,dc,cs,cb,cc) VALUES ('2026-05-06',1692960,0,18500,0,737790,0,0,0,164250,0,0,0,500823,312000,60000,5443508,1456570,711750) ON CONFLICT (date) DO UPDATE SET s_esp=EXCLUDED.s_esp,s_chq=EXCLUDED.s_chq,s_mob=EXCLUDED.s_mob,s_cred=EXCLUDED.s_cred,b_esp=EXCLUDED.b_esp,b_chq=EXCLUDED.b_chq,b_mob=EXCLUDED.b_mob,b_cred=EXCLUDED.b_cred,c_esp=EXCLUDED.c_esp,c_chq=EXCLUDED.c_chq,c_mob=EXCLUDED.c_mob,c_cred=EXCLUDED.c_cred,ds=EXCLUDED.ds,db=EXCLUDED.db,dc=EXCLUDED.dc,cs=EXCLUDED.cs,cb=EXCLUDED.cb,cc=EXCLUDED.cc,updated_at=now();
INSERT INTO public.journees (date,s_esp,s_chq,s_mob,s_cred,b_esp,b_chq,b_mob,b_cred,c_esp,c_chq,c_mob,c_cred,ds,db,dc,cs,cb,cc) VALUES ('2026-05-07',1177000,0,12000,0,438000,0,0,0,142500,0,0,0,1027260,315000,0,5581248,1679570,854250) ON CONFLICT (date) DO UPDATE SET s_esp=EXCLUDED.s_esp,s_chq=EXCLUDED.s_chq,s_mob=EXCLUDED.s_mob,s_cred=EXCLUDED.s_cred,b_esp=EXCLUDED.b_esp,b_chq=EXCLUDED.b_chq,b_mob=EXCLUDED.b_mob,b_cred=EXCLUDED.b_cred,c_esp=EXCLUDED.c_esp,c_chq=EXCLUDED.c_chq,c_mob=EXCLUDED.c_mob,c_cred=EXCLUDED.c_cred,ds=EXCLUDED.ds,db=EXCLUDED.db,dc=EXCLUDED.dc,cs=EXCLUDED.cs,cb=EXCLUDED.cb,cc=EXCLUDED.cc,updated_at=now();
INSERT INTO public.journees (date,s_esp,s_chq,s_mob,s_cred,b_esp,b_chq,b_mob,b_cred,c_esp,c_chq,c_mob,c_cred,ds,db,dc,cs,cb,cc) VALUES ('2026-05-08',2474470,0,0,240000,764000,0,0,0,180300,0,0,0,894000,510500,200000,6921718,1933070,834550) ON CONFLICT (date) DO UPDATE SET s_esp=EXCLUDED.s_esp,s_chq=EXCLUDED.s_chq,s_mob=EXCLUDED.s_mob,s_cred=EXCLUDED.s_cred,b_esp=EXCLUDED.b_esp,b_chq=EXCLUDED.b_chq,b_mob=EXCLUDED.b_mob,b_cred=EXCLUDED.b_cred,c_esp=EXCLUDED.c_esp,c_chq=EXCLUDED.c_chq,c_mob=EXCLUDED.c_mob,c_cred=EXCLUDED.c_cred,ds=EXCLUDED.ds,db=EXCLUDED.db,dc=EXCLUDED.dc,cs=EXCLUDED.cs,cb=EXCLUDED.cb,cc=EXCLUDED.cc,updated_at=now();
INSERT INTO public.journees (date,s_esp,s_chq,s_mob,s_cred,b_esp,b_chq,b_mob,b_cred,c_esp,c_chq,c_mob,c_cred,ds,db,dc,cs,cb,cc) VALUES ('2026-05-09',2483410,0,91700,0,909510,0,0,0,142650,0,0,0,675000,243500,0,8638428,2599080,977200) ON CONFLICT (date) DO UPDATE SET s_esp=EXCLUDED.s_esp,s_chq=EXCLUDED.s_chq,s_mob=EXCLUDED.s_mob,s_cred=EXCLUDED.s_cred,b_esp=EXCLUDED.b_esp,b_chq=EXCLUDED.b_chq,b_mob=EXCLUDED.b_mob,b_cred=EXCLUDED.b_cred,c_esp=EXCLUDED.c_esp,c_chq=EXCLUDED.c_chq,c_mob=EXCLUDED.c_mob,c_cred=EXCLUDED.c_cred,ds=EXCLUDED.ds,db=EXCLUDED.db,dc=EXCLUDED.dc,cs=EXCLUDED.cs,cb=EXCLUDED.cb,cc=EXCLUDED.cc,updated_at=now();

-- Reset puis insert des dépenses détaillées par journée importée
DELETE FROM public.journee_deps WHERE date IN ('2026-05-01','2026-05-02','2026-05-03','2026-05-05','2026-05-06','2026-05-07','2026-05-08','2026-05-09');
INSERT INTO public.journee_deps (date,service,label,montant,position) VALUES ('2026-05-01','s','dep total',221366,1);
INSERT INTO public.journee_deps (date,service,label,montant,position) VALUES ('2026-05-01','s','employer cuisinier prime 1er mai',80000,2);
INSERT INTO public.journee_deps (date,service,label,montant,position) VALUES ('2026-05-01','b','dep total',60100,1);
INSERT INTO public.journee_deps (date,service,label,montant,position) VALUES ('2026-05-01','b','paiement jour ferirer 1er mai',100000,2);
INSERT INTO public.journee_deps (date,service,label,montant,position) VALUES ('2026-05-02','s','TOTAL DEP CUISINE',670000,1);
INSERT INTO public.journee_deps (date,service,label,montant,position) VALUES ('2026-05-02','s','KOSSI',8000,2);
INSERT INTO public.journee_deps (date,service,label,montant,position) VALUES ('2026-05-02','s','GAZOIL',5000,3);
INSERT INTO public.journee_deps (date,service,label,montant,position) VALUES ('2026-05-02','s','FOURNITURE DE BUREAU',25400,4);
INSERT INTO public.journee_deps (date,service,label,montant,position) VALUES ('2026-05-02','s','RETOUR CLIENT',50000,5);
INSERT INTO public.journee_deps (date,service,label,montant,position) VALUES ('2026-05-02','b','TOTAL DEP',449760,1);
INSERT INTO public.journee_deps (date,service,label,montant,position) VALUES ('2026-05-03','s','dep total',258873,1);
INSERT INTO public.journee_deps (date,service,label,montant,position) VALUES ('2026-05-03','s','offert client',5000,2);
INSERT INTO public.journee_deps (date,service,label,montant,position) VALUES ('2026-05-03','s','AVC SALAIRE AVRIL INFOGRAPHE',100000,3);
INSERT INTO public.journee_deps (date,service,label,montant,position) VALUES ('2026-05-03','b','dep total bar',262500,1);
INSERT INTO public.journee_deps (date,service,label,montant,position) VALUES ('2026-05-03','b','CARBURANT',20000,2);
INSERT INTO public.journee_deps (date,service,label,montant,position) VALUES ('2026-05-05','s','depense sushi',930000,1);
INSERT INTO public.journee_deps (date,service,label,montant,position) VALUES ('2026-05-05','s','depense moustapha',54000,2);
INSERT INTO public.journee_deps (date,service,label,montant,position) VALUES ('2026-05-05','s','carnet de bon',10000,3);
INSERT INTO public.journee_deps (date,service,label,montant,position) VALUES ('2026-05-05','s','perte client',8500,4);
INSERT INTO public.journee_deps (date,service,label,montant,position) VALUES ('2026-05-05','b','depense bar',520000,1);
INSERT INTO public.journee_deps (date,service,label,montant,position) VALUES ('2026-05-05','b','offert client',4000,2);
INSERT INTO public.journee_deps (date,service,label,montant,position) VALUES ('2026-05-05','b','main doeuvre',25000,3);
INSERT INTO public.journee_deps (date,service,label,montant,position) VALUES ('2026-05-05','b','plomberie',38000,4);
INSERT INTO public.journee_deps (date,service,label,montant,position) VALUES ('2026-05-05','b','carnet de bon',10000,5);
INSERT INTO public.journee_deps (date,service,label,montant,position) VALUES ('2026-05-05','b','offert client',8000,6);
INSERT INTO public.journee_deps (date,service,label,montant,position) VALUES ('2026-05-06','s','depense tot sushi',266823,1);
INSERT INTO public.journee_deps (date,service,label,montant,position) VALUES ('2026-05-06','s','achat carotte',10000,2);
INSERT INTO public.journee_deps (date,service,label,montant,position) VALUES ('2026-05-06','s','administration police brazza',50000,3);
INSERT INTO public.journee_deps (date,service,label,montant,position) VALUES ('2026-05-06','s','sejour chris',75000,4);
INSERT INTO public.journee_deps (date,service,label,montant,position) VALUES ('2026-05-06','s','medicament ndaw',5000,5);
INSERT INTO public.journee_deps (date,service,label,montant,position) VALUES ('2026-05-06','s','offert client',2000,6);
INSERT INTO public.journee_deps (date,service,label,montant,position) VALUES ('2026-05-06','s','depense perso moustapha celio',92000,7);
INSERT INTO public.journee_deps (date,service,label,montant,position) VALUES ('2026-05-06','b','depense bar',200000,1);
INSERT INTO public.journee_deps (date,service,label,montant,position) VALUES ('2026-05-06','b','transport employe',30000,2);
INSERT INTO public.journee_deps (date,service,label,montant,position) VALUES ('2026-05-06','b','offert client',7000,3);
INSERT INTO public.journee_deps (date,service,label,montant,position) VALUES ('2026-05-06','b','infographe',75000,4);
INSERT INTO public.journee_deps (date,service,label,montant,position) VALUES ('2026-05-06','c','achat tabac',60000,1);
INSERT INTO public.journee_deps (date,service,label,montant,position) VALUES ('2026-05-07','s','depense sushi',474260,1);
INSERT INTO public.journee_deps (date,service,label,montant,position) VALUES ('2026-05-07','s','offert client',13000,2);
INSERT INTO public.journee_deps (date,service,label,montant,position) VALUES ('2026-05-07','s','carte de sejou',520000,3);
INSERT INTO public.journee_deps (date,service,label,montant,position) VALUES ('2026-05-07','b','depense bar',290000,1);
INSERT INTO public.journee_deps (date,service,label,montant,position) VALUES ('2026-05-07','b','offert client',12000,2);
INSERT INTO public.journee_deps (date,service,label,montant,position) VALUES ('2026-05-07','b','taxi',11000,3);
INSERT INTO public.journee_deps (date,service,label,montant,position) VALUES ('2026-05-07','b','ofert client',2000,4);
INSERT INTO public.journee_deps (date,service,label,montant,position) VALUES ('2026-05-08','s','depense sushi',640000,1);
INSERT INTO public.journee_deps (date,service,label,montant,position) VALUES ('2026-05-08','s','achat tenu philipine',100000,2);
INSERT INTO public.journee_deps (date,service,label,montant,position) VALUES ('2026-05-08','s','achat petit dej employe',46000,3);
INSERT INTO public.journee_deps (date,service,label,montant,position) VALUES ('2026-05-08','s','offert client',18500,4);
INSERT INTO public.journee_deps (date,service,label,montant,position) VALUES ('2026-05-08','s','depense diver cable + porte qrcode',50000,5);
INSERT INTO public.journee_deps (date,service,label,montant,position) VALUES ('2026-05-08','s','transport technicien',10000,6);
INSERT INTO public.journee_deps (date,service,label,montant,position) VALUES ('2026-05-08','s','offert client',9500,7);
INSERT INTO public.journee_deps (date,service,label,montant,position) VALUES ('2026-05-08','s','logiciel',20000,8);
INSERT INTO public.journee_deps (date,service,label,montant,position) VALUES ('2026-05-08','b','achat 2 ventillo + baffle',290000,1);
INSERT INTO public.journee_deps (date,service,label,montant,position) VALUES ('2026-05-08','b','transport personnelle',20000,2);
INSERT INTO public.journee_deps (date,service,label,montant,position) VALUES ('2026-05-08','b','depense bar',180000,3);
INSERT INTO public.journee_deps (date,service,label,montant,position) VALUES ('2026-05-08','b','offert client',4000,4);
INSERT INTO public.journee_deps (date,service,label,montant,position) VALUES ('2026-05-08','b','transport',16500,5);
INSERT INTO public.journee_deps (date,service,label,montant,position) VALUES ('2026-05-08','c','achat tabac',200000,1);
INSERT INTO public.journee_deps (date,service,label,montant,position) VALUES ('2026-05-09','s','tot dep (achat saumon)',585000,1);
INSERT INTO public.journee_deps (date,service,label,montant,position) VALUES ('2026-05-09','s','taxi emp cuisine',15000,2);
INSERT INTO public.journee_deps (date,service,label,montant,position) VALUES ('2026-05-09','s','billet avion christ',45000,3);
INSERT INTO public.journee_deps (date,service,label,montant,position) VALUES ('2026-05-09','s','offert client',2000,4);
INSERT INTO public.journee_deps (date,service,label,montant,position) VALUES ('2026-05-09','s','offert client',28000,5);
INSERT INTO public.journee_deps (date,service,label,montant,position) VALUES ('2026-05-09','b','taxi serveuse et bar',30000,1);
INSERT INTO public.journee_deps (date,service,label,montant,position) VALUES ('2026-05-09','b','logement christ info',30000,2);
INSERT INTO public.journee_deps (date,service,label,montant,position) VALUES ('2026-05-09','b','dep bar',183500,3);

COMMIT;

-- 4) Vérification
SELECT date, s_esp+s_chq+s_mob+s_cred AS ca_sushi, ds AS dep_sushi FROM public.journees ORDER BY date;
