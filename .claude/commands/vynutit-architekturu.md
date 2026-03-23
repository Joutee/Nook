---
name: vynutit-architekturu
description: Použij tento skill, kdykoliv tě uživatel požádá o úklid komponent, refaktorování adresářové struktury, kontrolu importů nebo masivní přesouvání souborů v Expo aplikaci.
---

# Architektonická pravidla pro Nook

Kdykoliv jsi požádán o kontrolu, refaktorování nebo úpravu architektury, MUSÍŠ striktně dodržet a vynutit tato pravidla.

1. **Struktura složky `app/` (Expo Router):**
   - V kořenové složce `app/` nesmí být žádné volně ležící soubory s pomlčkami v názvu (např. `chore-detail.tsx`, `expense-create.tsx`).
   - Hlavní obrazovky se spodní navigační lištou musí zůstat ve složce `(tabs)`.
   - **Formuláře a detaily musí být ve vlastních feature složkách mimo (tabs)**, aby se skryl tab bar (např. `app/chores/create.tsx`, `app/chores/[id].tsx`).

2. **Struktura složky `components/` (Složité UI):**
   - **Primitivní komponenty:** Vše z `@rn-primitives` (tlačítka, inputy, karty) MUSÍ být výhradně ve složce `components/ui/` s malými písmeny (např. `button.tsx`).
   - **Widgety:** Widgety pro hlavní dashboard zůstávají v `components/dashboard_widgets/`.
   - **Doménové komponenty (Feature-based):** V kořenové složce `components/` nesmí ležet žádné nesouvisející formuláře a složité komponenty (např. `ChoreForm.tsx`, `JoinFlatForm.tsx`). Vše musí být rozřazeno do doménových složek:
     - `components/chores/` (pro úkoly a historii)
     - `components/expenses/` (pro finance a rozpočítávání)
     - `components/flats/` (pro byty, seznamy členů a připojování)
     - `components/issues/` (pro hlášení problémů)
   - **Sdílené složité komponenty:** Komponenty používané napříč více doménami (modaly, bottom sheety, date pickery) patří do `components/shared/`.

3. **Logika a Stav:**
   - **Kontexty:** Veškerý React Context MUSÍ být ve složce `contexts/`.
   - **Utility:** Pomocné funkce musí být v `lib/` (např. `lib/choreUtils.ts`).

4. **Oprava Importů a Cest (Kritické):**
   - Kdykoliv přesouváš nebo přejmenováváš soubor (v `app/` nebo `components/`), MUSÍŠ najít všechny jeho reference v celém projektu a opravit importy.
   - Vždy preferuj absolutní importy pomocí aliasu `@/` (např. `import { Button } from '@/components/ui/button'`).
   - Pokud měníš strukturu rout v `app/`, musíš najít a opravit všechny `router.push()` a `<Link>` tagy, které na ně odkazují.
