# Germanium 3AS — Écosystème 2 APK Expo + Supabase

Deux apps mobiles **APK via Expo** pour le programme allemand 3AS Algérie : **App Candidat** & **App Admin**.

## Stack stricte
- **Framework:** Expo (React Native) + `expo-router`
- **UI:** `react-native-reanimated` 60 FPS, `lottie-react-native`, Glassmorphism 3D, haptics
- **Backend:** Supabase Auth / DB (RLS) / Realtime / Edge Functions & Triggers
- **Versioning:** GitHub

## Identité visuelle
- **Nom:** Germanium 3AS (#052E16 vert émeraude sombre / #121212 + doré #D4AF37 + #F5F5F5)
- **Boutons 3D:** ombres douces, dégradés dorés, spring + haptics
- **Fond:** particules dorées Lottie

## Supabase
- **Project Ref:** `vmcdlygpprywurypzlmj`
- **URL:** `https://vmcdlygpprywurypzlmj.supabase.co`
- **Tables:** `candidates`, `reference_codes`, `messages`, `lessons` (8 unités)
- **RLS:** activé, policies par rôle `admin`/`candidat`
- **Realtime:** chat candidat ↔ admin
- **Éphémère:** trigger supprime message 24h après envoi OU si `is_read_by_both=true`

## Apps
- **Admin** (`apps/admin`): login Supabase Auth, création candidat (Nom/Prénom/Wilaya/Établissement) → génération **instantanée** code `DE3AS-XXXX` via trigger, messagerie, dashboard 8 unités
- **Candidat** (`apps/candidat`): activation par code unique, dashboard 8 unités ELI5, support Telegram 3D (`https://t.me/roqaya_2328` cours & `https://t.me/walidvisa` réclamation), chat éphémère

## Installation
```bash
# 1. Dépendances
npm install

# 2. Supabase schema
# Copier supabase/schema.sql dans SQL Editor Supabase (https://vmcdlygpprywurypzlmj.supabase.co) et exécuter

# 3. Env
cp .env.example .env
# Renseigner EXPO_PUBLIC_SUPABASE_URL / ANON_KEY

# 4a. Admin
cd apps/admin && npm install && npx expo start

# 4b. Candidat
cd apps/candidat && npm install && npx expo start

# 5. Build APK (EAS)
npx eas build --platform android --profile preview
# ou local: npx expo export + eas build --local
```

## Contenu pédagogique 3AS LG (8 unités, méthode ELI5)
1. Die deutschsprachigen Länder und Algerien
2. Das Leben der Künstler
3. Der technische Fortschritt
4. Umweltprobleme
5. Massenmedien und Werbung
6. Korrespondenz und Kommunikation
7. Probleme der Jugend
8. Berufe und Professionen
Chaque unité: Vocabulaire illustré (couleurs genres: der=bleu, die=rouge, das=vert + emojis), Règle simplifiée ELI5, Texte, Exercice interactif

## GitHub
- Repo: `https://github.com/aigletraveler-source/Germanium3AS`
- `git init` + `git remote add origin https://github.com/aigletraveler-source/Germanium3AS.git`
