-- Germanium 3AS - Supabase Schema
-- Project Ref: vmcdlygpprywurypzlmj
-- Region: eu-west-1
-- Méthode: ELI5, 8 unités, éphémère 24h

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- =========================
-- Table: candidates (élèves 3AS)
-- =========================
create table if not exists public.candidates (
  id uuid primary key default uuid_generate_v4(),
  nom text not null,
  prenom text not null,
  wilaya text not null,
  etablissement text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
alter table public.candidates enable row level security;
create policy "Allow all for service_role" on public.candidates for all using (true) with check (true);
create policy "Public read for anon with code" on public.candidates for select using (true);

-- =========================
-- Table: reference_codes (DE3AS-XXXX)
-- =========================
create table if not exists public.reference_codes (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  status text not null default 'active' check (status in ('active','expired','revoked')),
  created_at timestamp with time zone default now(),
  expires_at timestamp with time zone default (now() + interval '6 months'),
  used_count int default 0,
  max_uses int default 1
);
create index if not exists idx_reference_codes_code on public.reference_codes(code);
create index if not exists idx_reference_codes_candidate on public.reference_codes(candidate_id);
alter table public.reference_codes enable row level security;
create policy "Allow all" on public.reference_codes for all using (true) with check (true);

-- Fonction génération code DE3AS-XXXX sécurisé
create or replace function public.generate_de3as_code()
returns text language plpgsql as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := 'DE3AS-';
  i int;
  pos int;
begin
  for i in 1..4 loop
    pos := floor(random()*length(chars)+1)::int;
    result := result || substr(chars, pos, 1);
  end loop;
  return result;
end;
$$;

-- Trigger: génération IMMÉDIATE du code dès création candidat (CRITIQUE)
create or replace function public.handle_new_candidate()
returns trigger language plpgsql as $$
declare
  new_code text;
  tries int := 0;
begin
  loop
    new_code := public.generate_de3as_code();
    begin
      insert into public.reference_codes (code, candidate_id, status)
      values (new_code, NEW.id, 'active');
      exit;
    exception when unique_violation then
      tries := tries + 1;
      if tries > 10 then raise exception 'Impossible de générer un code unique'; end if;
    end;
  end loop;
  return NEW;
end;
$$;

drop trigger if exists on_candidate_created on public.candidates;
create trigger on_candidate_created
after insert on public.candidates
for each row execute function public.handle_new_candidate();

-- Fonction validation code (pour App Candidat)
create or replace function public.validate_reference_code(input_code text)
returns table(is_valid boolean, message text, code_id uuid, candidate_id uuid, expires_at timestamp with time zone, nom text, prenom text)
language plpgsql as $$
declare
  rec record;
  cand record;
begin
  select * into rec from public.reference_codes where code = upper(trim(input_code));
  if not found then
    return query select false, 'Code invalide'::text, null::uuid, null::uuid, null::timestamp with time zone, null::text, null::text;
    return;
  end if;
  if rec.status != 'active' then
    return query select false, ('Code ' || rec.status)::text, rec.id, rec.candidate_id, rec.expires_at, null::text, null::text;
    return;
  end if;
  if rec.expires_at <= now() then
    update public.reference_codes set status='expired' where id=rec.id;
    return query select false, 'Code expiré'::text, rec.id, rec.candidate_id, rec.expires_at, null::text, null::text;
    return;
  end if;
  select * into cand from public.candidates where id=rec.candidate_id;
  return query select true, 'Code valide'::text, rec.id, rec.candidate_id, rec.expires_at, cand.nom, cand.prenom;
end;
$$;

-- =========================
-- Table: messages (éphémère)
-- =========================
create table if not exists public.messages (
  id uuid primary key default uuid_generate_v4(),
  sender_id text not null, -- peut être candidate_id ou 'admin'
  sender_role text not null check (sender_role in ('admin','candidat')),
  receiver_id text not null,
  receiver_role text not null check (receiver_role in ('admin','candidat')),
  content text not null,
  created_at timestamp with time zone default now(),
  expires_at timestamp with time zone, -- calculé à l'envoi +24h si éphémère
  is_read boolean default false,
  is_read_by_both boolean default false,
  is_auto_destruct boolean default true,
  destruct_after_seconds int default 86400, -- 24h
  is_deleted boolean default false
);
create index if not exists idx_messages_sender on public.messages(sender_id);
create index if not exists idx_messages_receiver on public.messages(receiver_id);
create index if not exists idx_messages_expires on public.messages(expires_at);
alter table public.messages enable row level security;
create policy "Allow all messages" on public.messages for all using (true) with check (true);

-- Trigger: définir expires_at à +24h si auto-destruct
create or replace function public.set_message_expiry()
returns trigger language plpgsql as $$
begin
  if NEW.is_auto_destruct and NEW.expires_at is null then
    NEW.expires_at := now() + (NEW.destruct_after_seconds || ' seconds')::interval;
  end if;
  return NEW;
end;
$$;
drop trigger if exists set_expiry on public.messages;
create trigger set_expiry before insert on public.messages for each row execute function public.set_message_expiry();

-- Fonction suppression si lu par les deux
create or replace function public.check_both_read()
returns trigger language plpgsql as $$
begin
  if NEW.is_read_by_both = true and OLD.is_read_by_both = false then
    -- suppression physique immédiate si les deux ont lu
    delete from public.messages where id = NEW.id;
    return null;
  end if;
  return NEW;
end;
$$;
drop trigger if exists check_both on public.messages;
create trigger check_both after update on public.messages for each row execute function public.check_both_read();

-- Fonction cleanup 24h (à appeler via cron ou depuis app)
create or replace function public.cleanup_expired_messages()
returns void language plpgsql as $$
begin
  delete from public.messages where expires_at is not null and expires_at <= now();
  delete from public.messages where is_auto_destruct = true and created_at <= now() - interval '24 hours';
end;
$$;

-- Cron: nécessite pg_cron (optionnel, sinon app appelle toutes les 5 sec)
-- select cron.schedule('cleanup-24h', '0 * * * *', 'select public.cleanup_expired_messages()');

-- =========================
-- Table: lessons (8 unités 3AS LG)
-- =========================
create table if not exists public.lessons (
  id uuid primary key default uuid_generate_v4(),
  unit_number int unique not null check (unit_number between 1 and 8),
  title_de text not null,
  title_fr text not null,
  theme text not null,
  vocab jsonb not null default '[]', -- [{de, fr, ar, emoji, color, example}]
  rule_eli5 text not null, -- explication ELI5 avec emojis
  text_content text not null, -- texte niveau 3AS vulgarisé
  exercises jsonb not null default '[]', -- [{question, options, answer, hint_eli5}]
  created_at timestamp with time zone default now()
);
alter table public.lessons enable row level security;
create policy "Allow all lessons" on public.lessons for all using (true) with check (true);

-- Seed 8 unités (ELI5)
insert into public.lessons (unit_number, title_de, title_fr, theme, vocab, rule_eli5, text_content, exercises) values
(1, 'Die deutschsprachigen Länder und Algerien', 'Les pays germanophones et l''Algérie', 'Géographie culturelle',
 '[{"de":"Deutschland","fr":"Allemagne","emoji":"🇩🇪","color":"#3B82F6"},{"de":"Algerien","fr":"Algérie","emoji":"🇩🇿","color":"#10B981"}]',
 'Pense aux pays comme à des maisons 🏠 Chaque maison a sa langue. Allemagne = maison germanophone, Algérie = maison amazighe/arabe/française. On compare les maisons !',
 'Hallo! Ich bin Amine aus Algier. Ich lerne Deutsch, weil Deutschland viele Autos baut. (Salut ! Je suis Amine d''Alger. J''apprends l''allemand car l''Allemagne construit beaucoup de voitures.)',
 '[{"question":"Comment dit-on ''Algérie'' en allemand?","options":["Algerien","Deutschland","Österreich"],"answer":0,"hint_eli5":"C''est le pays où tu habites, avec le drapeau 🇩🇿"}]'
),
(2, 'Das Leben der Künstler', 'La vie des artistes', 'Art & Culture',
 '[{"de":"der Maler","fr":"le peintre","emoji":"🎨","color":"#3B82F6"},{"de":"die Musik","fr":"la musique","emoji":"🎵","color":"#EF4444"}]',
 'Un artiste = un magicien avec un pinceau 🪄 Il transforme une feuille blanche en monde coloré. der Maler (bleu 💙) = le magicien garçon, die Malerin (rouge ❤️) = la magicienne fille.',
 'Bethoven war ein berühmter Musiker. Er hat schöne Musik gemacht. (Beethoven était un musicien célèbre. Il a fait de la belle musique.)',
 '[{"question":"Que fait un Maler?","options":["Il peint","Il chante","Il danse"],"answer":0,"hint_eli5":"Pense au pinceau 🎨"}]'
),
(3, 'Der technische Fortschritt', 'Le progrès technique', 'Technologie',
 '[{"de":"das Handy","fr":"le portable","emoji":"📱","color":"#10B981"},{"de":"der Computer","fr":"l''ordinateur","emoji":"💻","color":"#3B82F6"}]',
 'Le progrès = ton téléphone d''hier qui ne faisait que téléphoner ☎️ vs ton smartphone d''aujourd''hui qui fait tout 📱✨ C''est l''évolution magique !',
 'Das Handy ist sehr wichtig. Wir telefonieren jeden Tag. (Le portable est très important. Nous téléphonons chaque jour.)',
 '[{"question":"Comment dit-on ''ordinateur''?","options":["der Computer","das Handy","die Technik"],"answer":0,"hint_eli5":"La grosse machine avec écran 💻"}]'
),
(4, 'Umweltprobleme', 'Les problèmes de l''environnement', 'Écologie',
 '[{"de":"die Umwelt","fr":"l''environnement","emoji":"🌍","color":"#10B981"},{"de":"der Müll","fr":"les déchets","emoji":"🗑️","color":"#F59E0B"}]',
 'La Terre 🌍 = ta chambre géante. Si tu jettes des papiers partout 🗑️, ta chambre devient sale et tu ne respires plus bien. Il faut nettoyer !',
 'Die Umwelt ist schmutzig. Wir müssen die Umwelt schützen. (L''environnement est sale. Nous devons protéger l''environnement.)',
 '[{"question":"Que signifie Umwelt?","options":["Environnement","Voiture","École"],"answer":0,"hint_eli5":"Pense à la planète 🌍"}]'
),
(5, 'Massenmedien und Werbung', 'Les mass media et la publicité', 'Médias',
 '[{"de":"die Werbung","fr":"la pub","emoji":"📺","color":"#EF4444"},{"de":"die Zeitung","fr":"le journal","emoji":"📰","color":"#6B7280"}]',
 'La pub = quelqu''un qui crie très fort 📢 "ACHÈTE ÇA !" pour que tu aies envie. Les médias = les messagers qui portent sa voix.',
 'Die Werbung ist überall. Wir sehen Werbung im Fernsehen. (La pub est partout. Nous voyons la pub à la télé.)',
 '[{"question":"Où voit-on la Werbung?","options":["À la télé","Dans l''eau","Sous terre"],"answer":0,"hint_eli5":"Écran qui parle 📺"}]'
),
(6, 'Korrespondenz und Kommunikation', 'Correspondance et Communication', 'Communication',
 '[{"de":"der Brief","fr":"la lettre","emoji":"✉️","color":"#3B82F6"},{"de":"die E-Mail","fr":"l''e-mail","emoji":"📧","color":"#10B981"}]',
 'Une lettre ✉️ = un pigeon voyageur en papier qui porte ton message. Un e-mail 📧 = le même pigeon mais en fusée 🚀 super rapide !',
 'Ich schreibe einen Brief an meinen Freund. (J''écris une lettre à mon ami.)',
 '[{"question":"Comment dit-on ''lettre''?","options":["der Brief","das Handy","die Umwelt"],"answer":0,"hint_eli5":"Papier avec timbre ✉️"}]'
),
(7, 'Probleme der Jugend', 'Les problèmes de la jeunesse', 'Société',
 '[{"de":"die Jugend","fr":"la jeunesse","emoji":"🧑‍🎓","color":"#F59E0B"},{"de":"das Problem","fr":"le problème","emoji":"😟","color":"#EF4444"}]',
 'Être jeune = avoir un sac à dos 🎒 rempli de rêves mais aussi de petites pierres (problèmes). Il faut apprendre à enlever les pierres !',
 'Die Jugend hat viele Probleme. Zum Beispiel Stress in der Schule. (La jeunesse a beaucoup de problèmes. Par ex. le stress à l''école.)',
 '[{"question":"Que veut dire Jugend?","options":["Jeunesse","Vieillesse","Enfance"],"answer":0,"hint_eli5":"Toi, à 17 ans 🧑‍🎓"}]'
),
(8, 'Berufe und Professionen', 'Métiers et professions', 'Orientation',
 '[{"de":"der Arzt","fr":"le médecin","emoji":"👨‍⚕️","color":"#3B82F6"},{"de":"die Lehrerin","fr":"l''enseignante","emoji":"👩‍🏫","color":"#EF4444"}]',
 'Un métier = ton super-pouvoir futur 🦸‍♂️ der Arzt 💙 soigne, die Lehrerin ❤️ enseigne. Choisis ton costume !',
 'Mein Vater ist Lehrer. Er arbeitet in einer Schule. (Mon père est enseignant. Il travaille dans une école.)',
 '[{"question":"Qui soigne les malades?","options":["der Arzt","der Maler","der Brief"],"answer":0,"hint_eli5":"Avec blouse blanche 👨‍⚕️"}]'
)
on conflict (unit_number) do nothing;

-- Realtime
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.candidates;
