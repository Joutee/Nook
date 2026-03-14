# Nook 🏠

> Mobilní aplikace pro inteligentní správu sdíleného bydlení

[![React Native](https://img.shields.io/badge/React%20Native-0.81.5-blue.svg)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-~54.0-black.svg)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-green.svg)](https://supabase.com/)

## 📖 O projektu

Nook je multiplatformní mobilní aplikace (iOS, Android) vyvinutá v rámci bakalářské práce. Aplikace řeší komplexní správu sdíleného bydlení - od evidence financí, přes správu úkolů a jejich automatickou rotaci, až po správu dokumentů, klíčů a hlášení závad.

### 🎯 Motivace

Sdílené bydlení přináší řadu výzev v oblasti organizace, komunikace a správy společných zdrojů. Nook poskytuje centralizované řešení, které eliminuje potřebu používat množství různých aplikací a tabulek pro správu domácnosti.

## ✨ Hlavní funkce

### 👥 Pro nájemce
- **💰 Finance** - Evidence sdílených výdajů s automatickým výpočtem dluhů a optimalizací vyrovnávacích plateb
- **🧹 Úklid** - Automatická rotace úkolů mezi členy s historií plnění a žebříčkem
- **📊 Dashboard** - Plně přizpůsobitelný přehled s widgety pro každý modul
- **👤 Správa členů** - Správa členství a rolí v bytě

### 🏠 Pro pronajímatele
- **⚠️ Závady** - Hlášení a správa poruch s fotodokumentací
- **📄 Dokumenty** - Ukládání důležitých dokumentů (smlouvy, protokoly)
- **🔑 Klíče** - Evidence a přiřazování fyzických klíčů členům

### 🔄 Společné funkce
- **Multi-flat podpora** - Správa více domácností s různými rolemi
- **🌓 Tmavý režim** - Automatický nebo manuální přepínač motivu
- **🔐 Zabezpečení** - Row Level Security na úrovni databáze
- **📱 Offline-first** - Lokální cache pro rychlý přístup

## 🛠️ Technologický stack

### Frontend
- **React Native 0.81.5** - Cross-platform mobilní framework
- **Expo 54** (Managed Workflow) - Vývojové nástroje a nativní moduly
- **TypeScript 5.9** - Typová bezpečnost
- **Expo Router 6** - File-based navigace
- **NativeWind 4** - Tailwind CSS pro React Native
- **@rn-primitives** - Přístupnostní UI komponenty

### Backend
- **Supabase** - Backend-as-a-Service platforma
  - **Auth** - E-mail/heslo autentizace s JWT tokeny
  - **Database** - PostgreSQL s Row Level Security (RLS)
  - **Storage** - S3-kompatibilní objektové úložiště
  - **Realtime** (připraveno) - WebSocket subscriptions

### Klíčové knihovny
- `@supabase/supabase-js` - Supabase klient
- `react-native-draggable-flatlist` - Drag-and-drop seznamy
- `expo-document-picker` / `expo-image-picker` - Správa souborů
- `@react-native-async-storage/async-storage` - Lokální úložiště

## 🏗️ Architektura

```
Nook/
├── app/                          # Expo Router - file-based navigace
│   ├── _layout.tsx               # Kořenový layout s auth guardem
│   ├── (auth)/                   # Přihlášení, registrace
│   ├── (setup)/                  # Onboarding (vytvoření/připojení bytu)
│   ├── (tabs)/                   # Hlavní obrazovky s bottom tabs
│   │   ├── index.tsx             # Dashboard
│   │   ├── finance.tsx           # Správa financí
│   │   ├── chores.tsx            # Úkoly domácnosti
│   │   ├── issues.tsx            # Závady
│   │   ├── documents.tsx         # Dokumenty
│   │   ├── keys.tsx              # Klíče
│   │   └── more.tsx              # Další (navigační hub)
│   └── [detaily].tsx             # Stack screens pro detail/edit
├── components/                   # React komponenty
│   ├── ui/                       # Primitivní UI komponenty
│   └── dashboard_widgets/        # Widgety pro dashboard
├── contexts/                     # React kontexty
│   ├── FlatContext.tsx           # Globální stav bytu a role
│   └── ToastContext.tsx          # Notifikační systém
├── lib/                          # Utility funkce
│   ├── supabase.ts               # Supabase klient
│   ├── choreUtils.ts             # Logika úkolů
│   ├── financeUtils.ts           # Finanční výpočty
│   └── fileService.ts            # Správa souborů
├── types/                        # TypeScript typy
├── config/                       # Konfigurace
│   └── widgetConfig.ts           # Registr dashboard widgetů
└── assets/                       # Statická aktiva
```

## 📸 Screenshots

*Screenshoty aplikace budou přidány po dokončení implementace všech plánovaných funkcí.*

<!-- Placeholder pro screenshoty:
- Dashboard s widgety
- Seznam výdajů a vyrovnání dluhů
- Rotace úkolů domácnosti
- Hlášení závad s fotografií
- Správa dokumentů
- Tmavý režim
-->

## 🚀 Instalace a spuštění

### Požadavky

- **Node.js** >= 24.13.0
- **npm** >= 11.6.2
- **Expo CLI** (nainstaluje se automaticky)
- **Expo Go** (mobilní aplikace pro testování) nebo **Expo Dev Client**
- **Supabase účet** - [supabase.com](https://supabase.com)

### 1. Klonování repozitáře

```bash
git clone <url-repozitare>
cd Nook
```

### 2. Instalace závislostí

```bash
npm install
```

### 3. Konfigurace Supabase

#### 3.1 Vytvoření Supabase projektu

1. Vytvořte nový projekt na [supabase.com](https://supabase.com)
2. Zkopírujte **Project URL** a **anon public key** z nastavení API

#### 3.2 Inicializace databázového schématu

Databázové schéma je k dispozici v adresáři `supabase/migrations/`. Pro inicializaci databáze:

**Možnost 1: Manuální import přes SQL Editor**

1. Otevřete Supabase Dashboard → SQL Editor
2. Zkopírujte obsah souboru `supabase/migrations/20260314101841_remote_schema.sql`
3. Spusťte SQL dotaz (Run)

**Možnost 2: Použití Supabase CLI** *(doporučeno)*

```bash
# Instalace Supabase CLI
npm install -g supabase

# Link projektu
supabase link --project-ref your-project-ref

# Spuštění migrace
supabase db push
```

**Hlavní tabulky:**
- `profiles` - Uživatelské profily
- `flats` - Byty/domácnosti
- `flat_profile` - Členství uživatelů v bytech (s rolí)
- `expenses`, `expense_shares` - Finance
- `chores`, `chore_profile`, `chore_completions` - Úkoly
- `issues` - Závady
- `documents` - Dokumenty
- `keys` - Klíče

**Databázové pohledy:**
- `view_chore_dashboard` - Aktuální stav úkolů
- `view_chore_history` - Historie úkolů
- `view_flat_balances` - Finanční zůstatky členů

**Storage Buckety:**
```sql
-- Vytvořte dva buckety v Supabase Storage:
-- 1. "documents" - pro dokumenty
-- 2. "issue-images" - pro fotografie závad
```

#### 3.3 Environment proměnné

Vytvořte soubor `.env` v kořenovém adresáři projektu:

```bash
cp .env.example .env
```

Vyplňte hodnoty z Supabase projektu:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=your-anon-public-key
```

### 4. Spuštění aplikace

```bash
# Vývojový server
npm start

# Spuštění na Android
npm run android

# Spuštění na iOS (pouze macOS)
npm run ios

# Web verze (experimentální)
npm run web
```

### 5. Testování v Expo Go

1. Nainstalujte **Expo Go** na mobilní zařízení
   - [Android](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - [iOS](https://apps.apple.com/app/expo-go/id982107779)

2. Naskenujte QR kód z terminálu po spuštění `npm start`

## 🎨 Přizpůsobení tématu

Aplikace podporuje světlé/tmavé téma s plně přizpůsobitelnými barvami. Konfigurace se nachází v:

- `global.css` - CSS custom properties (HSL hodnoty)
- `tailwind.config.js` - Tailwind token registry

Primární barva: **Lila/Fialová** (`hsl(270, 89.1%, 49%)`)

## 📊 Datový model

### Klíčové relace

```
profiles (1) ----< (N) flat_profile (N) >---- (1) flats
                        |
                        ├─< expenses
                        ├─< chores
                        ├─< issues
                        ├─< documents
                        └─< keys
```

### Automatizace (Triggery)

- `set_first_user_as_admin()` - Automatické přidělení admin role prvnímu členovi
- `reassign_admin_on_delete()` - Předání admin role při odstranění správce

## 🔒 Bezpečnost

### Row Level Security (RLS)

Všechny tabulky jsou chráněny RLS politikami na úrovni PostgreSQL:

- Uživatelé vidí pouze data bytů, kde jsou aktivními členy
- `auth.uid()` funkce PostgreSQL automaticky filtruje dotazy
- JWT tokeny jsou bezpečně persistovány v nativním úložišti (iOS Keychain / Android EncryptedSharedPreferences)

### Autentizace

- E-mail/heslo přes Supabase Auth
- Automatická obnova JWT tokenů
- Session validace při startu aplikace

### Storage

- Signed URLs s omezenou platností
- Přístup pouze pro autentizované uživatele
- Automatická komprese obrázků před nahráním (1080px, 60% kvalita)

## 📚 Použité návrhové vzory

- **File-based routing** (Expo Router) - Konvence > konfigurace
- **Context API** - Globální state management bez externích knihoven
- **Compound Components** - Složené UI komponenty (BottomSheet, Modal)
- **Optimistic UI** - Okamžitá zpětná vazba před potvrzením serveru
- **Database Views** - Agregace dat na straně databáze
- **Trigger-based automation** - Business logika v databázových triggerech

## 🧪 Známá omezení

- ⚠️ Pole `is_admin` v tabulce `flat_profile` je upravitelné běžnými členy (plánovaná migrace do samostatné tabulky)
- 📱 Web verze je experimentální a není plně funkční
- 🔄 Realtime subscriptions připraveny, ale neimplementovány

## 🎓 Akademický kontext

Tento projekt byl vytvořen jako součást bakalářské práce na téma **"Návrh a implementace mobilní aplikace pro správu sdíleného bydlení"**.

**Klíčové výstupy:**
- Analýza požadavků a návrh systému
- Implementace full-stack mobilní aplikace
- Testování a dokumentace
- Komplexní master context dokument (`MASTER_CONTEXT.md`)

## 📄 Dokumentace

Podrobná technická dokumentace je k dispozici v souboru [`MASTER_CONTEXT.md`](./MASTER_CONTEXT.md), který obsahuje:

- Kompletní popis architektury
- Detailní popis všech modulů a jejich business logiky
- Datový model s přehledem všech tabulek
- Bezpečnostní model
- Popis triggerů a databázových funkcí

## 🗺️ Roadmap

- [ ] Implementace realtime notifikací
- [ ] Push notifications
- [ ] Export finančních reportů (PDF)
- [ ] Kalendářní integrace pro úkoly
- [ ] OCR pro dokumenty
- [ ] Migrace admin oprávnění do samostatné tabulky
- [ ] Podpora více měn
- [ ] Lokalizace (EN, CZ)

## 📦 Build

Pro vytvoření produkčního buildu použijte Expo Application Services (EAS):

```bash
# Instalace EAS CLI
npm install -g eas-cli

# Login
eas login

# Konfigurace
eas build:configure

# Build
eas build --platform android
eas build --platform ios
```

---

**Poznámka:** Tento projekt slouží primárně pro akademické účely v rámci bakalářské práce.
