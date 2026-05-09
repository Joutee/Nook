# Nook

Mobilni aplikace pro spravu sdileneho bydleni. Projekt je postaveny na React Native, Expo Routeru a Supabase. Vznika jako soucast bakalarske prace.

Nook resi bezne agendy ve sdilenem byte: finance, uklidove ukoly, zavadovy system, dokumenty, klice, role clenu a prepinani mezi vice byty.

## Stack

- React Native 0.81.5
- Expo 54
- Expo Router 6
- TypeScript 5.9
- NativeWind 4
- Supabase Auth, PostgreSQL, Storage a Row Level Security

Projekt je klientsky. Vlastni API server zde neni; aplikace komunikuje primo se Supabase pres `@supabase/supabase-js`.

## Hlavni moduly

- Finance: sdilene vydaje, podily, vyrovnani dluhu a opakovane platby.
- Uklid: rotace ukolu mezi cleny, historie splneni a dashboard widgety.
- Zavady: evidence zavad s popisem, stavem a fotodokumentaci.
- Dokumenty: nahravani a prohlizeni dokumentu pres Supabase Storage.
- Klice: evidence fyzickych klicu a jejich prirazeni clenum.
- Byty a role: vice bytu na uzivatele, role `najemce` a `pronajimatel`.
- Dashboard: konfigurovatelne widgety podle role uzivatele.

## Struktura projektu

```text
app/                         Expo Router routes
  _layout.tsx                Root layout, providers and auth guard
  (auth)/                    Login, registration and password reset
  (setup)/                   Flat onboarding and role selection
  (tabs)/                    Main authenticated tabs
components/                  Reusable React Native components
  ui/                        Primitive UI components
  dashboard_widgets/         Dashboard widgets
config/                      App configuration, widget registry
contexts/                    React contexts
hooks/                       Shared hooks
lib/                         Supabase client, services and utilities
supabase/
  migrations/                Database migrations
  functions/                 Supabase Edge Functions
types/                       Shared TypeScript types
```

## Pozadavky

- Node.js 24.13.0 nebo novejsi
- npm 11.6.2 nebo novejsi
- Expo Go nebo Expo Dev Client
- Supabase projekt

## Instalace

```bash
npm install
```

Vytvor `.env` podle `.env.example`:

```bash
cp .env.example .env
```

Vypln Supabase hodnoty:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=your-anon-public-key
```

Promenne s prefixem `EXPO_PUBLIC_` jsou dostupne v klientskem kodu. Autorizace je resena pres RLS politiky v databazi.

## Databaze

Migrace jsou v `supabase/migrations/`.

Pri pouziti Supabase CLI:

```bash
npx supabase link --project-ref your-project-ref
npx supabase db push
```

Alternativne lze obsah migraci spustit rucne v Supabase SQL Editoru.

Zakladni tabulky:

- `profiles`
- `flats`
- `flat_profile`
- `expenses`
- `expense_shares`
- `chores`
- `chore_profile`
- `chore_completions`
- `issues`
- `documents`
- `keys`

Zakladni views:

- `view_chore_dashboard`
- `view_chore_history`
- `view_flat_balances`

Storage buckety:

- `documents`
- `issue-images`

## Spusteni

```bash
npm start
npm run android
npm run ios
npm run web
```

`npm run ios` vyzaduje macOS. Web verze slouzi hlavne pro rychle overeni UI.

## Navigace a pristup

Expo Router mapuje soubory v `app/` na routy. Auth guard je v `app/_layout.tsx` a smeruje uzivatele podle stavu session, vybraneho bytu a role.

Role jsou ulozene v tabulce `flat_profile`:

- `najemce`: finance, uklid, bezne clenstvi v byte
- `pronajimatel`: zavady, dokumenty, klice a sprava bytu

Pristup k datum je omezeny pres PostgreSQL Row Level Security.

## Stav a data

Projekt nepouziva externi state management. Globalni stav je reseny pres React Context:

- `contexts/FlatContext.tsx`: vybrany byt, role a souvisejici odvozene hodnoty
- `contexts/ToastContext.tsx`: notifikace v aplikaci

Sdilene utility a servisni funkce jsou v `lib/`, napr. `fileService`, `choreUtils`, `financeUtils`, `biometricAuth` a `theme`.

## Vzhled

Styling je postaveny na NativeWindu. Tokeny jsou definovane v:

- `global.css`
- `tailwind.config.js`

Primarni barva aplikace je `hsl(270 89.1% 49%)`. Aplikace podporuje svetly i tmavy rezim.

## Build

Produkcnich buildu se dosahuje pres Expo Application Services:

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android
eas build --platform ios
```

## Dokumentace

Podrobnejsi technicky kontext je v `MASTER_CONTEXT.md`. Instrukce pro praci s repozitarem jsou v `AGENTS.md` a `CLAUDE.md`.
