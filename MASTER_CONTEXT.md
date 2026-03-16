# Master Context File — Aplikace Nook

## Mobilní aplikace pro správu sdíleného bydlení

> **Účel dokumentu:** Tento soubor slouží jako kompletní znalostní základna (knowledge base) popisující architekturu, technologický stack, datový model a business logiku aplikace Nook. Je určen jako primární zdroj kontextu pro generativní AI nástroje (NotebookLM apod.) využívané při psaní bakalářské práce. Neobsahuje zdrojové kódy — popisuje systém na úrovni vysokoúrovňového návrhu (High-Level Design).

---

## 1. Celkový technologický stack

### 1.1 Frontend

Klientská část aplikace je vybudována nad ekosystémem **React Native** (verze 0.81.5) v kombinaci s frameworkem **Expo** (verze 54, managed workflow). Tento přístup umožňuje vývoj nativní mobilní aplikace pro platformy **iOS** i **Android** ze sdíleného TypeScriptového zdrojového kódu, bez nutnosti přímé správy nativních projektů.

**Klíčové frontendové technologie:**

- **React Native 0.81.5** — Základní framework pro tvorbu nativního uživatelského rozhraní. Komponenty jsou renderovány jako nativní prvky operačního systému (UIView na iOS, View na Androidu), nikoli jako webové elementy.
- **Expo 54 (Managed Workflow)** — Nadstavba nad React Native poskytující sadu předkonfigurovaných nativních modulů, build pipeline (EAS Build), a vývojové nástroje (Expo Go, Expo Dev Client). Managed workflow zajišťuje, že Expo spravuje nativní konfiguraci projektu.
- **TypeScript 5.9** — Staticky typovaný nadmnožina JavaScriptu, použitá v celém projektu pro zajištění typové bezpečnosti a zlepšení vývojového prostředí.
- **Expo Router 6** — Souborově orientovaný (file-based) router inspirovaný frameworkem Next.js. Struktura složek v adresáři `app/` přímo definuje navigační hierarchii aplikace, což eliminuje potřebu explicitní konfigurace navigačních zásobníků.
- **NativeWind 4** — Knihovna přinášející paradigma **Tailwind CSS** do prostředí React Native. Umožňuje stylovat komponenty pomocí utility tříd (např. `className="flex-1 bg-primary text-white"`), přičemž tyto třídy jsou za běhu překládány na nativní `StyleSheet` objekty. Využívá **tailwind-merge** a **clsx** pro podmíněné skládání tříd.
- **@rn-primitives** — Sada přístupnostně orientovaných primitivních UI komponent pro React Native (checkbox, label, portal, separator, slot, switch), analogicky k projektu Radix UI pro webové prostředí.
- **class-variance-authority (CVA)** — Knihovna pro definici variant komponent (např. různé velikosti a styly tlačítka) pomocí deklarativního API.
- **React Native Gesture Handler** — Nativní vrstva pro zpracování dotykových gest, nezbytná pro správnou funkci drag-and-drop a vlastního BottomSheet komponentu.
- **react-native-draggable-flatlist** — Komponenta umožňující přeskupování položek seznamu pomocí táhnutí (drag-and-drop), využívaná v modulu přeskupování widgetů a pořadí členů v rotaci úklidu.
- **Expo Image Picker / Document Picker / Image Manipulator / File System** — Nativní moduly Expo pro výběr fotografií z galerie nebo pořízení snímku fotoaparátem, výběr souborů (PDF, obrázky), kompresi obrázků a operace se souborovým systémem.
- **react-native-webview** — Komponenta vkládající nativní webový prohlížeč do React Native aplikace. Využívána pro zobrazení PDF dokumentů přes Google Docs Viewer (záložní řešení pro Android).
- **@react-native-community/datetimepicker** — Nativní výběr data a času pro iOS a Android.
- **expo-clipboard** — Přístup ke schránce operačního systému (využíváno pro kopírování pozvánek kódu).
- **Animated API (React Native)** — Vestavěné API pro deklarativní animace, využívané v implementaci vlastního `BottomSheet` komponentu a systému toast notifikací.

### 1.2 Backend (Supabase)

Backend aplikace je postaven výhradně na platformě **Supabase** — open-source alternativě k Firebase, která poskytuje sadu cloudových služeb nad relační databází PostgreSQL.

**Klíčové backendové technologie a služby:**

- **Supabase Auth** — Spravuje autentizaci uživatelů. Aplikace využívá autentizaci prostřednictvím **e-mailu a hesla**. Platforma spravuje JWT tokeny (JSON Web Tokens), jejich vydávání, obnovu (refresh) a invalidaci. Supabase Auth je pevně integrována s Row Level Security (RLS) na úrovni databáze — každý autentizovaný požadavek automaticky předává identitu uživatele (`auth.uid()`) do databázových politik.
- **Supabase Database (PostgreSQL)** — Plnohodnotná relační databáze PostgreSQL sloužící jako primární datové úložiště aplikace. Obsahuje tabulky pro uživatelské profily, byty, finance, úkoly, závady, dokumenty a klíče. Databáze využívá **databázové pohledy (Views)** pro agregaci dat, která by jinak vyžadovala komplexní dotazy na klientovi (zejména pro modul úklidu a financí).
- **Supabase Storage** — Objektové úložiště kompatibilní s S3 pro ukládání binárních souborů. Aplikace využívá dva oddělené bucket (kontejnery): `documents` pro dokumenty sdíleného bydlení a `issue-images` pro fotografie nahlášených závad. Přístup k souborům je řízen pomocí přístupových politik.
- **Row Level Security (RLS)** — Mechanismus PostgreSQL, který umožňuje definovat přístupová pravidla přímo na úrovni databázových tabulek a řádků. Každý SQL dotaz provedený přes Supabase klienta je automaticky filtrován podle aktivních RLS politik, takže uživatel může přistupovat pouze k datům svého bytu.
- **Supabase JavaScript Client (`@supabase/supabase-js`)** — Klientská knihovna, která abstrahuje komunikaci s REST API a GraphQL rozhraním Supabase. Veškerá komunikace s databází, autentizací a úložištěm probíhá prostřednictvím této knihovny.

---

## 2. Struktura projektu a navigace

### 2.1 Adresářová struktura projektu

Projekt dodržuje konvence Expo Router a organizaci souborů doporučenou ekosystémem React Native. Klíčové adresáře jsou:

```
Nook/
├── app/                    # Expo Router — každý soubor = jedna obrazovka nebo layout
│   ├── _layout.tsx         # Kořenový layout: providery, autentizační guard, Stack navigátor
│   ├── (auth)/             # Skupina nechráněných tras (přihlášení, registrace)
│   ├── (setup)/            # Skupina tras pro onboarding (vytvoření/připojení k bytu)
│   ├── (tabs)/             # Skupina hlavních obrazovek s dolní navigační lištou
│   └── [screen].tsx        # Jednotlivé stack obrazovky (detaily, formuláře)
├── components/             # Znovupoužitelné React Native komponenty
│   ├── ui/                 # Primitivní UI komponenty (Button, Card, Input, Text...)
│   └── dashboard_widgets/  # Widgety pro přizpůsobitelný dashboard
├── config/                 # Konfigurační soubory (registr widgetů)
├── contexts/               # React kontexty pro globální stav
├── lib/                    # Utilitní funkce, Supabase klient, pomocné moduly
├── types/                  # TypeScript definice typů a rozhraní
├── assets/                 # Statická aktiva (fonty, obrázky)
├── global.css              # Globální CSS proměnné (HSL tokeny pro světlé/tmavé téma)
└── tailwind.config.js      # Konfigurace NativeWind/Tailwind
```

**Klíčové konfigurační soubory:**

- **`app.json`** — Konfigurace Expo aplikace (název, bundle identifier, ikony, splash screen, oprávnění).
- **`package.json`** — Správa závislostí projektu (npm/yarn).
- **`tsconfig.json`** — Konfigurace TypeScriptu s cestovým aliasem `@/*` mapovaným na kořen projektu, umožňující absolutní importy (např. `import { supabase } from "@/lib/supabase"`).
- **`tailwind.config.js`** — Definice sémantických barevných tokenů (viz sekce 2.3) a pluginu NativeWind.
- **`global.css`** — Definice CSS custom properties pro světlé a tmavé barevné téma pomocí HSL hodnot.
- **`config/widgetConfig.ts`** — Centrální registr všech dostupných widgetů dashboardu: mapování klíčů na komponenty, názvy, ikony a dostupnost dle role.

### 2.2 Navigační architektura (Expo Router)

Aplikace využívá **Expo Router** — souborově orientovaný navigační framework, jenž v prostředí React Native implementuje paradigma podobné Next.js App Routeru. Navigační hierarchie je definována strukturou souborů v adresáři `app/`.

**Tři navigační skupiny (Route Groups):**

Expo Router podporuje tzv. skupiny tras (route groups), označené závorkami v názvu složky. Tyto skupiny umožňují logické členění tras bez vlivu na URL strukturu, zejména pro sdílení layoutů a ochranu přístupu.

1. **`(auth)/`** — Skupina nechráněných obrazovek pro nepřihlášené uživatele:
   - `login.tsx` — Přihlášení pomocí e-mailu a hesla; odkaz na obnovu hesla.
   - `register.tsx` — Registrace nového účtu (jméno, příjmení, e-mail, heslo, potvrzení hesla); volá `supabase.auth.signUp()`.
   - `forgot-password.tsx` — Formulář pro zaslání odkazu pro obnovu hesla.
   - `verify-email.tsx` — Ověření e-mailové adresy pomocí OTP kódu.

2. **`(setup)/`** — Skupina onboardingových obrazovek pro přihlášené uživatele bez dokončeného nastavení:
   - `join-flat.tsx` — Připojení ke stávajícímu bytu zadáním pozvánek kódu.
   - `create-flat.tsx` — Vytvoření nového bytu (vygeneruje unikátní kód, zobrazí `CodeModal`).
   - `select-role.tsx` — Výběr role v bytu: **nájemce** nebo **pronajímatel**.

3. **`(tabs)/`** — Skupina hlavních obrazovek přístupná pouze plně autentizovaným a nastavení dokončivším uživatelům. Zobrazuje dolní navigační lištu (**Bottom Tab Bar**).

**Stack navigace pro detailní obrazovky:**

Nad skupinou `(tabs)` je v kořenovém layoutu (`_layout.tsx`) registrován **Stack navigátor**, který spravuje přechodové animace a záhlaví pro detailní a formulářové obrazovky (viz seznam v sekci `app/_layout.tsx`). Tyto obrazovky jsou přístupné ze všech záložek a patří k nim např. `expense-create`, `chore-detail`, `issue-edit`, `document-add` apod.

### 2.3 Autentizační guard a řízení navigace

Řízení přístupu je implementováno v komponentě `LayoutContent` uvnitř `app/_layout.tsx`. Tato komponenta po každé změně stavu (session, výsledky načítání bytu) vyhodnotí aktuální navigační segment a provede přesměrování:

| Stav uživatele                  | Akce                                                      |
| ------------------------------- | --------------------------------------------------------- |
| Nepřihlášen                     | Přesměrování na `/(auth)/login`                           |
| Přihlášen, bez bytu             | Přesměrování na `/(setup)/join-flat`                      |
| Přihlášen, byt zvolen, bez role | Přesměrování na `/(setup)/select-role`                    |
| Přihlášen, byt i role nastaveny | Přesměrování na `/(tabs)` (pokud je v auth/setup skupině) |

### 2.4 Podmíněné zobrazení záložek dle role

Konfigurace záložek v `app/(tabs)/_layout.tsx` využívá hodnotu `userRole` z `FlatContext` k dynamickému skrývání nepříslušných záložek. Záložka je skryta nastavením vlastnosti `href: null`. Logika je binární: `isTenant = userRole !== "pronajimatel"`.

| Záložka                 | Ikona      | Viditelná pro      |
| ----------------------- | ---------- | ------------------ |
| Domů (`index`)          | `home`     | Oba role           |
| Finance (`finance`)     | `wallet`   | Pouze nájemce      |
| Úkoly (`chores`)        | `reader`   | Pouze nájemce      |
| Závady (`issues`)       | `warning`  | Pouze pronajímatel |
| Klíče (`keys`)          | `key`      | Pouze pronajímatel |
| Dokumenty (`documents`) | `document` | Pouze pronajímatel |
| Další (`more`)          | `menu`     | Pouze nájemce      |

Nájemci přistupují k modulům Závad, Klíčů a Dokumentů přes záložku **Další** (`more.tsx`), která funguje jako navigační hub.

### 2.5 Téma a vizuální systém

Barevný systém aplikace je založen na sémantických tokenech definovaných jako CSS custom properties (HSL hodnoty) v souboru `global.css` a registrovaných v `tailwind.config.js`. Primární akcent aplikace je lila/fialová barva (`hsl(270, 89.1%, 49%)`). Sémantické tokeny zahrnují: `background`, `foreground`, `card`, `primary`, `primary-foreground`, `secondary`, `muted`, `muted-foreground`, `accent`, `destructive`, `success`, `warning`, `border`, `input` a `ring`.

Tmavý režim je řízen hookem `useColorScheme()` z NativeWind. Uživatelská preference (světlá/tmavá/systémová) je persistována v AsyncStorage. Komponenta `ThemeToggle` cyklicky přepíná mezi třemi stavy.

---

## 3. State Management a Kontexty

### 3.1 Architektura správy stavu

Aplikace nevyužívá žádnou externí knihovnu pro správu stavu (Redux, Zustand apod.). Globální stav je spravován výhradně pomocí **React Context API** ve dvou specializovaných kontextech. Lokální stav (data načtená pro konkrétní obrazovku) je udržován pomocí standardních React hooků `useState` a `useEffect` přímo v komponentách obrazovek.

### 3.2 FlatContext — Centrální kontext bytu a role

**`contexts/FlatContext.tsx`** je nejkritičtějším stavovým celkem celé aplikace. Poskytuje globálně dostupný stav obsahující:

- **`currentFlat: Flat | null`** — Aktuálně vybraný byt (objekt s `id`, `name`, `address`).
- **`flats: Flat[]`** — Seznam všech bytů, ke kterým má přihlášený uživatel aktivní členství.
- **`userRole: "pronajimatel" | "najemce" | null`** — Role uživatele v aktuálně vybraném bytě.
- **`isLoading: boolean`** — Indikátor probíhajícího načítání dat.
- **`setCurrentFlat(flat: Flat)`** — Funkce pro přepnutí aktivního bytu.
- **`refreshFlats()`** — Funkce pro opětovné načtení seznamu bytů ze serveru.

**Odvozené hodnoty** (computed values) jsou vypočítány v custom hooku `useFlatContext()`:

- **`hasFlat: boolean`** — `true` pokud má uživatel alespoň jeden byt.
- **`hasRole: boolean`** — `true` pokud má uživatel byt i přiřazenou roli.

**Životní cyklus a logika načítání:**

Při změně `session.user.id` (přihlášení/odhlášení) se spustí funkce `fetchFlats()`, která dotazuje tabulku `flat_profile` s join na tabulku `flats` a filtruje záznamy s `active = true` pro daného uživatele. Po načtení seznamu bytů:

1. Aplikace se pokusí načíst `@current_flat_id` z **AsyncStorage** (klíč identifikující naposledy zvolený byt).
2. Pokud nalezená hodnota odpovídá některému bytu v načteném seznamu, tento byt je nastaven jako aktivní a z `flat_profile` se načte odpovídající role.
3. Pokud v AsyncStorage žádná hodnota není nebo neodpovídá, je nastaven první byt v seznamu.
4. Pokud uživatel nemá žádné aktivní členství, `currentFlat` a `userRole` jsou nastaveny na `null`, což spustí přesměrování do skupiny `(setup)/`.

**Přepínání bytů:**

Funkce `setCurrentFlat(flat)` uloží nové `flat.id` do AsyncStorage a poté provede samostatný dotaz do `flat_profile`, aby načetla roli uživatele pro nově zvolený byt. Toto zajišťuje, že `userRole` je vždy konzistentní s `currentFlat` — uživatel může mít v různých bytech různé role.

**Umístění v komponentovém stromě:**

`FlatProvider` obaluje celou `LayoutContent` komponentu, je obalena `ToastProvider` a přijímá prop `session` od kořenového `RootLayout`. Pořadí providerů je: `SafeAreaProvider → ToastProvider → FlatProvider → LayoutContent`.

### 3.3 ToastContext — Globální notifikační systém

**`contexts/ToastContext.tsx`** implementuje vlastní systém toast notifikací bez závislosti na externích knihovnách. Poskytuje jedinou funkci:

- **`showToast(message: string, type?: "success" | "error" | "info")`** — Zobrazí notifikační pruh v horní části obrazovky.

**Implementace:**

Každá notifikace je animována pomocí `Animated.Value` — snímek vyjede z horní části obrazovky (translateY: −100 → 0) a po 3 sekundách automaticky se animací vrátí. Systém podporuje zároveň více notifikací najednou (fronta). Toast je renderován absolutně pozicí nad veškerým ostatním obsahem (`zIndex: 9999`, `top: 50`). Barevné rozlišení typů: úspěch = zelená (`bg-success`), chyba = červená (`bg-destructive`), info = fialová (`bg-primary`).

### 3.4 Perzistence stavu v AsyncStorage

**`@react-native-async-storage/async-storage`** slouží jako lokální key-value úložiště na zařízení. Aplikace jej využívá pro:

| Klíč                         | Obsah                                           |
| ---------------------------- | ----------------------------------------------- |
| `@current_flat_id`           | UUID naposledy aktivního bytu                   |
| `@dashboard_layout_{flatId}` | JSON pole klíčů widgetů pro daný byt            |
| (interní Supabase klíče)     | JWT tokeny pro persistenci autentizační session |

Supabase klient je inicializován s `storage: AsyncStorage`, což zajišťuje, že přihlašovací tokeny přetrvají i po restartu aplikace. Modul `lib/supabase.ts` exportuje singleton instanci klienta s parametry `autoRefreshToken: true`, `persistSession: true` a `detectSessionInUrl: false` (nezbytné v prostředí React Native, kde není k dispozici URL bar prohlížeče).

---

## 4. Hlavní funkční moduly (Business logika)

### 4.1 Modul Financí

**Umístění:** `app/(tabs)/finance.tsx`, `components/ExpenseForm.tsx`, `components/ExpenseSplitSection.tsx`, `components/SettlementList.tsx`, `app/expense-create.tsx`, `app/expense-edit.tsx`

**Popis modulu:**

Modul financí je přístupný výhradně uživatelům s rolí **nájemce**. Jeho účelem je evidovat sdílené výdaje domácnosti a automaticky vypočítat, kdo komu dluží, a navrhnout optimální vyrovnávací platby.

**Datový model:**

- Tabulka **`expenses`** — Eviduje jednotlivé výdaje s atributy: identifikátor, datum zaznamenání (`created_at`), datum vzniku výdaje (`happened_at`), identifikátor bytu, identifikátor plátce (`payer_id`), název výdaje, celková částka a příznak `is_settlement` (označující, zda jde o vyrovnávací platbu a nikoli skutečný výdaj).
- Tabulka **`expense_shares`** — Přiřazuje konkrétnímu výdaji podíly jednotlivých členů domácnosti. Každý záznam obsahuje `expense_id`, `profile_id` a `owed_amount` (dlužná částka daného člena).
- Databázový pohled **`view_flat_balances`** — Agreguje všechny výdaje a podíly pro daný byt a vrací čistý zůstatek (`net_balance`) pro každého člena. Kladný zůstatek znamená, že člen má pohledávku (ostatní mu dluží); záporný zůstatek znamená dluh.

**Logika rozúčtování výdajů (`components/ExpenseSplitSection.tsx`):**

Při zadávání výdaje může uživatel zvolit jeden ze dvou způsobů rozdělení:

1. **Automatické rozdělení (Auto)** — Celková částka výdaje je rovnoměrně rozdělena mezi všechny členy bytu. Případný zbytek po celočíselném dělení je přibalen k prvnímu členovi.
2. **Ruční rozdělení (Manual)** — Každý člen má vlastní vstupní pole pro zadání své části. Systém sleduje, která pole uživatel skutečně vyplnil (`touchedMembers` množina). Po opuštění (blur) libovolného pole je zbývající nevyplněná částka automaticky rozdělena mezi členy, jejichž pole nebylo dosud dotyknuto — tím je zachována invarianta, že součet všech podílů se vždy rovná celkové částce.

**Algoritmus optimálního vyrovnávání dluhů (`components/SettlementList.tsx`):**

Z pohledu `view_flat_balances` jsou načteny čisté zůstatky všech členů. Komponenta `SettlementList` implementuje **hladový algoritmus** (greedy algorithm) pro minimalizaci počtu potřebných vyrovnávacích plateb:

1. Zůstatky jsou rozděleny do dvou skupin: **dlužníci** (záporné zůstatky) a **věřitelé** (kladné zůstatky).
2. Obě skupiny jsou seřazeny sestupně podle absolutní hodnoty.
3. Iterativně je párován největší dlužník s největším věřitelem.
4. Vyrovnávací transakce je vytvořena na hodnotu minima z obou pohledávek/dluhů.
5. Zůstatky obou stran jsou sníženy o tuto hodnotu; strany s nulovým zůstatkem jsou odstraněny a algoritmus pokračuje k dalšímu páru.

Tento přístup garantuje minimální počet transakcí potřebných k úplnému vyrovnání dluhů v rámci skupiny.

**Zobrazení:**

Obrazovka Finance zobrazuje (1) seznam posledních 50 výdajů seřazených sestupně dle `happened_at` s jménem plátce, (2) sekci čistých zůstatků jednotlivých členů a (3) sekci navrhovaných vyrovnávacích plateb. Klepnutím na výdaj se otevře obrazovka pro úpravu.

### 4.2 Modul Úklidu (Chores)

**Umístění:** `app/(tabs)/chores.tsx`, `components/ChoreForm.tsx`, `components/MemberOrderList.tsx`, `app/chore-create.tsx`, `app/chore-edit.tsx`, `app/chore-detail.tsx`, `app/chore-history.tsx`, `lib/choreUtils.ts`

**Popis modulu:**

Modul úklidu je přístupný výhradně uživatelům s rolí **nájemce**. Umožňuje definovat opakující se úkoly domácnosti s automatickou rotací přiřazení mezi členy.

**Datový model:**

- Tabulka **`chores`** — Definice úkolu: identifikátor, `flat_id`, název, popis, `interval_days` (délka cyklu ve dnech) a `start_date` (datum zahájení první rotace).
- Tabulka **`chore_profile`** — Definuje pořadí rotace: pro každý úkol obsahuje záznamy s `chore_id`, `profile_id` a `rotation_order` (celočíselné pořadí v rotaci).
- Tabulka **`chore_completions`** — Zaznamenává splnění úkolu: `chore_id`, `profile_id` (kdo splnil) a `cycle_index` (index aktuálního cyklu).
- Databázový pohled **`view_chore_dashboard`** — Pro každý úkol vrací kompletní informace pro zobrazení na dashboardu: aktuální index cyklu (`current_cycle_index`), identifikátor a jméno aktuálně přiřazeného člena (`current_assignee_id`, `assignee_name`, `assignee_surname`) a příznak dokončení aktuálního cyklu (`is_completed_current_cycle`). Tento pohled zapouzdřuje veškerou logiku výpočtu aktuálního cyklu z data zahájení a délky intervalu.
- Databázový pohled **`view_chore_history`** — Pro každý historický cyklus každého úkolu vrací: datum zahájení cyklu, kdo byl přiřazen (expected), zda byl úkol splněn a kdo a kdy ho splnil (`completed_by_*`).

**Rotační logika:**

Aktuální přiřazenému člen je determinován na straně databáze (pohled `view_chore_dashboard`). Cyklus je vypočítán jako: `current_cycle_index = floor((CURRENT_DATE - start_date) / interval_days)`. Přiřazený člen pro daný cyklus pak odpovídá záznamu v `chore_profile` s `rotation_order = current_cycle_index % počet_členů`.

**Datum příštího termínu (zobrazení na klientovi):**

Obrazovka `chores.tsx` vypočítává datum termínu příštího cyklu: `start_date + (current_cycle_index + 1) * interval_days`, a zobrazuje ho jako "Termín za X dní" nebo "Termín: dnes/zítra".

**Splnění úkolu (`lib/choreUtils.ts`):**

Funkce `completeChore()` provede validaci (ověří, že volající uživatel je aktuálně přiřazenou osobou a že cyklus ještě nebyl dokončen) a poté vloží záznam do `chore_completions`. Tato operace je dostupná pouze přiřazenému členovi — tlačítko "Označit jako hotové" se zobrazí pouze tehdy, když `assignee_user_id === currentUserId` a `is_completed_current_cycle === false`.

**Správa rotace:**

Při vytváření nebo úpravě úkolu (`ChoreForm`) může uživatel definovat pořadí rotace přetažením členů (`MemberOrderList` s `react-native-draggable-flatlist`). Výsledné pořadí je uloženo jako záznamy v `chore_profile` s příslušnými hodnotami `rotation_order`.

**Historie:**

Obrazovka `chore-history.tsx` zobrazuje data z pohledu `view_chore_history` — seznam všech minulých cyklů s informací o tom, kdo byl přiřazen, zda úkol splnil, a kdo případně za něj úkol dokončil (v případě zastoupení).

### 4.3 Modul Klíčů

**Umístění:** `app/(tabs)/keys.tsx`, `components/KeyForm.tsx`, `components/dashboard_widgets/KeysWidget.tsx`, `app/key-create.tsx`, `app/key-edit.tsx`

**Popis modulu:**

Modul Klíčů umožňuje evidovat fyzické klíče od bytu nebo jiných prostorů a spravovat jejich přiřazení konkrétním členům domácnosti. Záložka Klíče je zobrazena v navigační liště primárně pro **pronajímatele**, avšak modul je dostupný i nájemcům skrze záložku Další a widget dashboardu.

**Datový model:**

- Tabulka **`keys`** — Eviduje klíče: identifikátor, `flat_id`, název klíče (`name`), popis, datum vytvoření (`created_at`), autor záznamu (`created_by`) a aktuální držitel (`assigned_to`, nullable UUID odkazující na `profiles`).

**Typ `KeyWithAssignee`** (`types/keys.ts`) rozšiřuje základní typ `Key` o vnořený objekt `assignee` obsahující `id`, `name`, `surname` a `avatar_url` přiřazeného člena (nebo `null` pokud klíč není přiřazen nikomu).

**Logika přiřazení:**

Na obrazovce `keys.tsx` je pro každý klíč zobrazeno tlačítko pro přiřazení. Po jeho stisknutí se otevře `BottomSheet` s výběrem člena (radio-style — pouze jeden lze vybrat). Pokud je stisknut již vybraný člen, přiřazení se zruší (`assigned_to: null`). Změna přiřazení se provede UPDATE dotazem na tabulku `keys`.

**Widget dashboardu (`KeysWidget`):**

Widget zobrazuje zkrácený přehled klíčů přímo na dashboardu. Tato komponenta je dostupná oběma rolím.

### 4.4 Modul Závad (Issues)

**Umístění:** `app/(tabs)/issues.tsx`, `components/IssueForm.tsx`, `app/issue-create.tsx`, `app/issue-detail.tsx`, `app/issue-edit.tsx`, `lib/issueUtils.ts`

**Popis modulu:**

Modul závad slouží k nahlašování a správě poruch a závad v bytě. Nájemci hlásí závady, pronajímatelé je spravují a aktualizují jejich stav. Záložka Závady je primárně zobrazena **pronajímatelům** v navigační liště; nájemci přistupují k modulu skrze záložku Další.

**Datový model:**

- Tabulka **`issues`** — Eviduje závady: identifikátor, `flat_id`, `profile_id` (nahlašovatel), název (`title`), popis, `image_path` (cesta k fotografii v bucketu `issue-images`, nullable), datum vytvoření, datum poslední aktualizace a stav (`status`).

**Stavy závady (stavový stroj):**

Závada prochází čtyřmi stavy, přičemž přechody jsou realizovány přímou aktualizací pole `status` v tabulce `issues`:

| Status        | Zobrazení | Barva          |
| ------------- | --------- | -------------- |
| `new`         | Nová      | Modrá          |
| `in_progress` | Řeší se   | Žlutá/oranžová |
| `resolved`    | Vyřešeno  | Zelená         |
| `cancelled`   | Zrušeno   | Červená        |

Modul `lib/issueUtils.ts` poskytuje pomocné funkce `getStatusColor(status)` a `getStatusText(status)` pro sjednocenou interpretaci stavů v UI.

**Správa fotografií:**

Nájemce může při nahlašování závady přiložit fotografii. `IssueForm` využívá `lib/fileService.ts` pro výběr fotografie z galerie nebo pořízení snímku fotoaparátem. Fotografie je před nahráním zkomprimována (šířka 1080 px, kvalita 60 %, formát JPEG), zakódována do base64 a nahrána do Supabase Storage bucketu `issue-images` pod cestou `{flat_id}/{timestamp}_{filename}`. Cesta k souboru je uložena do pole `image_path` záznamu závady.

**Detail závady:**

Obrazovka `issue-detail.tsx` zobrazuje plné informace o závadě včetně fotografie (zobrazena v `DocumentViewerModal`). Pronajímatel může ze záhlaví obrazovky přejít na úpravu a cyklicky přepínat stav závady.

### 4.5 Modul Dokumentů

**Umístění:** `app/(tabs)/documents.tsx`, `components/DocumentViewerModal.tsx`, `app/document-add.tsx`

**Popis modulu:**

Modul dokumentů slouží k ukládání a sdílení důležitých dokumentů sdíleného bydlení (nájemní smlouva, předávací protokol, pojistky apod.). Dokumenty může přidávat a prohlížet libovolná role.

**Datový model:**

- Tabulka **`documents`** — Eviduje dokumenty: identifikátor, `flat_id`, název (`name`), popis, datum vytvoření a `document_path` (cesta k souboru v bucketu `documents`).

**Nahrávání souborů (`document-add.tsx`):**

Uživatel může nahrát dokument dvěma způsoby: výběrem souboru z úložiště zařízení (`expo-document-picker`, typy `application/pdf` a `image/*`) nebo pořízením fotografie. Celý pipeline zpracování souboru je delegován na `lib/fileService.ts`. Po úspěšném nahrání do Supabase Storage je do tabulky `documents` vložen nový záznam s odpovídající `document_path`.

**Prohlížení a stahování:**

Pro každý dokument na seznamu jsou k dispozici akcí:

1. **Otevřít** — Generuje se podepsaná URL (Signed URL) z Supabase Storage a dokument je zobrazen v komponentě `DocumentViewerModal`. Pro PDF soubory na Androidu je dokument otevřen přes Google Docs Viewer embed v `react-native-webview`; obrázky jsou zobrazeny přímo.
2. **Stáhnout** — Generuje se podepsaná URL s parametrem `download:`, který vynutí stažení souboru do zařízení.
3. **Smazat** — Smaže soubor z Supabase Storage a odstraní odpovídající záznam z tabulky `documents`.

### 4.6 Modul Správy Bytů a Přepínání

**Umístění:** `app/(setup)/create-flat.tsx`, `app/(setup)/join-flat.tsx`, `app/join-another-flat.tsx`, `app/create-another-flat.tsx`, `components/FlatsList.tsx`, `components/TopBar.tsx`, `components/MemberList.tsx`, `app/settings.tsx`

**Popis modulu:**

Aplikace jsou navržena pro podporu **multi-flat** scénáře — jeden uživatel může být členem více domácností zároveň (s různými rolemi). Tento modul zahrnuje vše, co se týká lifecycle správy bytu.

**Vytvoření bytu:**

Obrazovka `create-flat.tsx` (onboarding) a `create-another-flat.tsx` (pro stávající uživatele) prezentují formulář pro zadání jména a adresy bytu. Po odeslání je:

1. Vložen nový záznam do tabulky `flats` s unikátním pozvánek kódem (náhodně generovaný řetězec).
2. Vložen záznam do `flat_profile` s rolí a příznakem `is_admin: true` pro zakladatele bytu.
3. Zobrazen `CodeModal` s vygenerovaným kódem a možností jeho zkopírování do schránky.

**Připojení k bytu:**

Uživatel zadá pozvánek kód. Aplikace vyhledá byt s odpovídajícím polem `code` v tabulce `flats` a vytvoří záznam v `flat_profile` s výchozí rolí nájemce.

**Přepínání bytů (`TopBar`):**

Komponenta `TopBar.tsx` (zobrazena pouze v záložkách) sleduje délku seznamu `flats` z `FlatContext`. Pokud má uživatel více než jeden byt, název aktuálního bytu je klikatelný a po klepnutí otevře `BottomSheet` s komponentou `FlatsList`, která zobrazuje všechny dostupné byty. Výběrem bytu je volána funkce `setCurrentFlat()` z `FlatContext`.

**Správa členů a administrace bytu (`settings.tsx`):**

Obrazovka Nastavení zobrazuje pozvánek kód bytu a umožňuje otevřít `MembersBottomSheet`. Komponenta `MemberList` zobrazuje všechny aktivní členy daného bytu (dotaz na `flat_profile` s join na `profiles`). Uživatelé s příznakem `is_admin: true` v záznamu `flat_profile` mají přístup k administračním akcím:

- **Odebrání člena** — Nastaví `flat_profile.active = false`, čímž fakticky ukončí členství. Každý uživatel může odebrat sám sebe.
- **Změna role** — Aktualizuje pole `role` v záznamu `flat_profile`.
- Obě akce jsou chráněny potvrzovacím dialogem (`AlertDialog`).

### 4.7 Dashboard a Systém Widgetů

**Umístění:** `app/(tabs)/index.tsx`, `app/reorder-widgets.tsx`, `config/widgetConfig.ts`, `components/dashboard_widgets/`, `components/WidgetReorderItem.tsx`

**Popis modulu:**

Dashboard (záložka Domů) je plně přizpůsobitelná rozcestníková obrazovka, jejíž obsah je tvořen widgety. Každý widget je samostatná React komponenta zobrazující miniaturní přehled dat z konkrétního funkčního modulu.

**Registr widgetů (`config/widgetConfig.ts`):**

Celý systém widgetů je data-driven. Centrální konfigurace definuje:

- **`WIDGET_COMPONENTS`** — Mapování řetězcového klíče na React komponentu widgetu.
- **`WIDGET_NAMES`** a **`WIDGET_ICONS`** — Mapování klíčů na uživatelsky čitelné názvy a ikony (pro obrazovku přeskupování).
- **`WIDGETS_BY_ROLE`** — Definuje, které widgety jsou dostupné pro každou roli. Pronajímatel nemá přístup k `my_chores_widget` ani `chore_leaderboard_widget`.
- **`DEFAULT_WIDGETS_BY_ROLE`** — Výchozí sada widgetů zobrazená při prvním přístupu v daném bytě.

**Dostupné widgety:**

| Klíč                       | Název                 | Role    |
| -------------------------- | --------------------- | ------- |
| `my_chores_widget`         | Moje úkoly            | Nájemce |
| `repayment_widget`         | Vyrovnání dluhů       | Nájemce |
| `chore_leaderboard_widget` | Žebříček plnění úkolů | Nájemce |
| `issues_widget`            | Poslední závady       | Obě     |
| `flat_members_widget`      | Členové bytu          | Obě     |
| `documents_widget`         | Dokumenty             | Obě     |
| `flats_widget`             | Moje byty             | Obě     |
| `keys_widget`              | Klíče                 | Obě     |

**Persistování rozvržení:**

Pořadí widgetů je uloženo jako JSON pole klíčů (např. `["my_chores_widget", "repayment_widget", "issues_widget"]`) ve dvou vrstvách:

1. **Databáze** — Pole `dashboard_layout` (typ jsonb) v záznamu `flat_profile` pro daného uživatele a byt.
2. **AsyncStorage** — Lokální cache pod klíčem `@dashboard_layout_{flatId}`.

Při prvním načtení v dané session je rozvržení synchronizováno z databáze (a uloženo do cache); při dalších načteních téhož bytu v téže session je použita cache (sledováno pomocí module-level `Set<string> syncedFlats`). Přeskupování probíhá na obrazovce `reorder-widgets.tsx` pomocí `react-native-draggable-flatlist`.

---

## 5. Bezpečnostní model

### 5.1 Autentizace

Autentizaci celé aplikace zajišťuje **Supabase Auth**. Kořenový layout (`app/_layout.tsx`) při startu aplikace volá `supabase.auth.getSession()` a následně ověřuje platnost session na serveru zavoláním `supabase.auth.getUser()`. Pokud server vrátí chybu, lokální session je invalidována a uživatel je odhlášen (`supabase.auth.signOut()`). Tím je zajištěno, že aplikace nepracuje s expirovanou nebo revokovanou session.

Supabase klient je inicializován s `persistSession: true` a `storage: AsyncStorage`, takže JWT tokeny jsou bezpečně persistovány v nativním AsyncStorage (na iOS v Keychain, na Androidu v EncryptedSharedPreferences přes implementaci AsyncStorage).

Automatická obnova tokenů (`autoRefreshToken: true`) zajišťuje transparentní refresh JWT access tokenů pomocí refresh tokenů bez zásahu uživatele.

### 5.2 Autorizace na úrovni databáze (Row Level Security)

Supabase umožňuje definovat **Row Level Security (RLS)** politiky přímo v PostgreSQL. I přes to, že zdrojový kód projektu neobsahuje explicitní SQL soubory s definicemi RLS politik (schéma je spravováno přes Supabase Dashboard), Supabase automaticky zpřístupňuje `auth.uid()` funkci v RLS politikách. Každý API požadavek je proveden s JWT tokenem přihlášeného uživatele, jehož identita je ověřena na úrovni PostgreSQL before každým dotazem.

Architektura předpokládá, že RLS politiky jsou nastaveny tak, aby:

- Uživatel mohl číst pouze data (byty, výdaje, úkoly, závady, dokumenty, klíče) těch bytů, ve kterých je aktivním členem (`flat_profile.active = true`).
- Operace INSERT, UPDATE a DELETE jsou omezeny na záznamy patřící aktívnímu bytu uživatele.

### 5.3 Databázové triggery a serverová business logika

Část business logiky aplikace je implementována přímo na úrovni databáze prostřednictvím **PostgreSQL triggerů** a **PL/pgSQL funkcí** spravovaných v Supabase Dashboard. Tato vrstva zajišťuje, že kritická invarianta (konzistence přiznaku správce bytu) je vynucována serverem nezávisle na chování klientské aplikace.

Na tabulce `flat_profile` jsou definovány tři triggery volající dvě PL/pgSQL funkce:

---

#### Funkce `set_first_user_as_admin()`

Tato funkce je spojena se dvěma triggery:

- **`auto_set_admin`** — spouštěný `BEFORE INSERT` na tabulce `flat_profile`
- **`auto_set_admin_on_update`** — spouštěný `BEFORE UPDATE` na tabulce `flat_profile`

**Logika funkce:**

Funkce automaticky nastavuje hodnotu pole `is_admin` pro každý nový nebo aktualizovaný záznam členství (`flat_profile`) dle následujících pravidel:

1. Pokud je nový člen přidáván s rolí `pronajimatel`, je mu **vždy automaticky přidělen příznak správce** (`is_admin = true`). Tato podmínka reflektuje předpoklad, že pronajímatel má přirozeně administrativní kontrolu nad bytem.
2. Pokud je člen přidáván s rolí `najemce`, funkce porovná hodnotu sloupce `joined_at` nového záznamu s minimální hodnotou `joined_at` všech záznamů téhož bytu. Jde-li o nejstaršího (prvního) nájemce tohoto bytu, je mu přiznán správcovský příznak (`is_admin = true`); v opačném případě je příznak nastaven na `false`.

Tento mechanismus zajišťuje, že první nájemce vstupující do bytu automaticky získá administrátorská práva (např. pokud byt nemá pronajímatele), a to bez nutnosti explicitního zásahu klientské aplikace.

---

#### Funkce `reassign_admin_on_delete()`

Tato funkce je spojena s triggerem:

- **`auto_reassign_admin`** — spouštěný `AFTER DELETE` na tabulce `flat_profile`

**Logika funkce:**

Funkce řeší scénář, kdy je ze skupiny odebrán člen s příznakem správce. Při mazání záznamu z `flat_profile` funkce nejprve ověří, zda odstraňovaný člen byl správcem (`OLD.is_admin = true`). Pokud ano, funkce provede `UPDATE` tabulky `flat_profile` a nastaví `is_admin = true` na záznamu zbývajícího člena s nejnižší hodnotou `joined_at` (tj. nejdéle přítomného člena bytu). Tím je zajištěno, že byt nikdy nezůstane bez správce — administrátorská role je automaticky a deterministicky předána dalšímu nejstaršímu členovi.

---

**Přehled triggerů na tabulce `flat_profile`:**

| Název triggeru             | Událost | Timing | Volaná funkce                |
| -------------------------- | ------- | ------ | ---------------------------- |
| `auto_set_admin`           | INSERT  | BEFORE | `set_first_user_as_admin()`  |
| `auto_set_admin_on_update` | UPDATE  | BEFORE | `set_first_user_as_admin()`  |
| `auto_reassign_admin`      | DELETE  | AFTER  | `reassign_admin_on_delete()` |

**Architektonický význam:**

Implementace těchto triggerů přesouvá správu správcovských oprávnění částečně z aplikační vrstvy do databázové vrstvy. Tím je dosaženo toho, že logika přidělování správce je vynucována serverem bez ohledu na to, odkud (klientská aplikace, Supabase Dashboard, přímý SQL dotaz) změna záznamu pochází. Tento přístup zvyšuje robustnost systému a snižuje riziko nekonzistentního stavu dat.

### 5.4 Identifikovaná bezpečnostní omezení

Na základě poznámek vývojáře (`notes.txt`) bylo identifikováno následující bezpečnostní omezení, které je předmětem budoucí opravy:

**Pole `is_admin` v tabulce `flat_profile`** — Přestože existující triggery automaticky spravují hodnotu `is_admin` při standardních operacích (INSERT, UPDATE, DELETE), pole samotné zůstává součástí tabulky `flat_profile`, na níž mají členové bytu povoleny UPDATE operace prostřednictvím RLS politik. Existuje tedy teoretická možnost, že uživatel přímým UPDATE požadavkem (mimo normální workflow aplikace) změní hodnotu pole `is_admin`. Navrhované řešení (zaznamenané ve vývojářských poznámkách) je přesunout správu administrátorských oprávnění do samostatné tabulky chráněné přísnějšími RLS politikami, kde UPDATE bude povolen pouze pro existující administrátory — a triggery přepsat tak, aby operovaly na tuto oddělenou tabulku.

### 5.5 Bezpečnost souborového úložiště

Soubory v Supabase Storage jsou přístupné přes **Signed URLs** (podepsané URL) s omezenou dobou platnosti. Aplikace negeneruje veřejně přístupné URL k souborům — každý požadavek na zobrazení nebo stažení souboru vyžaduje vygenerování nové podepsané URL na straně klienta přes Supabase SDK. Tím je zajištěno, že přístup k souborům je podmíněn platnou autentizovanou session.

### 5.6 Komunikace s backendem

Veškerá komunikace mezi klientskou aplikací a Supabase backendem probíhá přes **HTTPS** (šifrované spojení). Supabase URL a anonymní API klíč (`EXPO_PUBLIC_SUPABASE_KEY`) jsou konfigurationy jako environment proměnné s prefixem `EXPO_PUBLIC_`, které jsou vkládány do bundle při sestavení aplikace. Tento veřejný klíč (anon key) má omezená oprávnění — veškeré citlivé operace jsou chráněny RLS politikami na úrovni databáze, nikoli klíčem samotným.

---

## Příloha A: Přehled tabulek databáze

| Tabulka             | Popis                            | Klíčové sloupce                                                                                           |
| ------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `profiles`          | Profily registrovaných uživatelů | `id` (= auth.uid), `name`, `surname`, `username`, `avatar_url`, `updated_at`                              |
| `flats`             | Registrované domácnosti          | `id`, `name`, `address`, `code`                                                                           |
| `flat_profile`      | Členství uživatele v bytě        | `id`, `flat_id`, `profile_id`, `role`, `active`, `is_admin`, `joined_at`, `dashboard_layout`              |
| `chores`            | Definice opakujících se úkolů    | `id`, `flat_id`, `name`, `description`, `interval_days`, `start_date`                                     |
| `chore_profile`     | Pořadí rotace členů pro úkol     | `chore_id`, `profile_id`, `rotation_order`                                                                |
| `chore_completions` | Historie dokončení úkolů         | `chore_id`, `profile_id`, `cycle_index`, `completed_at`                                                   |
| `expenses`          | Výdaje domácnosti                | `id`, `flat_id`, `payer_id`, `title`, `amount`, `currency`, `happened_at`, `is_settlement`                |
| `expense_shares`    | Podíly členů na výdaji           | `id`, `expense_id`, `profile_id`, `owed_amount`                                                           |
| `issues`            | Nahlášené závady                 | `id`, `flat_id`, `profile_id`, `title`, `description`, `status`, `image_path`, `created_at`, `updated_at` |
| `keys`              | Evidence klíčů                   | `id`, `flat_id`, `name`, `description`, `assigned_to`, `created_by`, `created_at`                         |
| `documents`         | Dokumenty domácnosti             | `id`, `flat_id`, `name`, `description`, `document_path`, `created_at`                                     |

> **Poznámka k sloupci `joined_at` (tabulka `flat_profile`):** Tento timestamp je klíčovým vstupem pro oba databázové triggery — funkce `set_first_user_as_admin()` i `reassign_admin_on_delete()` ho využívají jako kritérium pro určení "nejstaršího" (prvního přidaného) člena bytu při automatickém přidělování nebo předávání správcovských oprávnění.

> **Poznámka k sloupci `currency` (tabulka `expenses`):** Sloupec je součástí schématu pro budoucí podporu více měn. V aktuální implementaci klientská aplikace zobrazuje veškeré částky jako české koruny (Kč) pomocí funkce `formatCurrency()` z `lib/financeUtils.ts`.

## Příloha B: Přehled databázových pohledů (Views)

| Pohled                 | Využití                                                             | Popis                                                      |
| ---------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------- |
| `view_chore_dashboard` | `chores.tsx`, `MyChoresWidget`                                      | Aktuální stav každého úkolu (cyklus, přiřazení, dokončení) |
| `view_chore_history`   | `chore-history.tsx`                                                 | Historizovaný přehled cyklů úkolů                          |
| `view_flat_balances`   | `finance.tsx`, `SettlementList`, `BalanceWidget`, `RepaymentWidget` | Čistý finanční zůstatek každého člena bytu                 |

## Příloha C: Supabase Storage Buckety

| Bucket         | Obsah                     | Šablona cesty                      |
| -------------- | ------------------------- | ---------------------------------- |
| `documents`    | PDF a obrázkové dokumenty | `{flat_id}/{timestamp}_{filename}` |
| `issue-images` | Fotografie závad          | `{flat_id}/{timestamp}_{filename}` |

## Příloha D: Databázové triggery a PL/pgSQL funkce

### Funkce `set_first_user_as_admin()`

- **Typ:** `RETURNS TRIGGER`, jazyk `plpgsql`
- **Volána triggery:** `auto_set_admin` (BEFORE INSERT), `auto_set_admin_on_update` (BEFORE UPDATE)
- **Tabulka:** `flat_profile`

**Pseudokód logiky:**

```
IF NEW.role = 'pronajimatel' THEN
    NEW.is_admin := true          -- Pronajímatel = vždy správce
ELSE
    IF NEW.joined_at = MIN(joined_at) WHERE flat_id = NEW.flat_id THEN
        NEW.is_admin := true      -- Nejstarší nájemce = správce
    ELSE
        NEW.is_admin := false     -- Ostatní nájemci = ne-správce
    END IF
END IF
RETURN NEW
```

### Funkce `reassign_admin_on_delete()`

- **Typ:** `RETURNS TRIGGER`, jazyk `plpgsql`
- **Volána triggerem:** `auto_reassign_admin` (AFTER DELETE)
- **Tabulka:** `flat_profile`

**Pseudokód logiky:**

```
IF OLD.is_admin = true THEN
    UPDATE flat_profile
    SET is_admin = true
    WHERE flat_id = OLD.flat_id
      AND id = (SELECT id FROM flat_profile
                WHERE flat_id = OLD.flat_id
                ORDER BY joined_at ASC
                LIMIT 1)
END IF
RETURN OLD
```

### Souhrnná tabulka triggerů

| Trigger                    | Tabulka        | Událost | Timing | Volaná funkce                | Účel                                               |
| -------------------------- | -------------- | ------- | ------ | ---------------------------- | -------------------------------------------------- |
| `auto_set_admin`           | `flat_profile` | INSERT  | BEFORE | `set_first_user_as_admin()`  | Automatické přidělení `is_admin` při přidání člena |
| `auto_set_admin_on_update` | `flat_profile` | UPDATE  | BEFORE | `set_first_user_as_admin()`  | Přepočet `is_admin` při změně role nebo záznamu    |
| `auto_reassign_admin`      | `flat_profile` | DELETE  | AFTER  | `reassign_admin_on_delete()` | Předání správcovství při odstranění správce        |

---

_Dokument vygenerován dne 13. března 2026. Popisuje stav kódu odpovídající větvi `main` repozitáře projektu Nook._
