# Receipt OCR — Design Spec

## Overview

Funkcionalita pro skenování účtenek v modulu financí. Uživatel vyfotí nebo nahraje účtenku z obchodu, aplikace ji pošle na Claude Haiku 4.5 Vision přes Supabase Edge Function, která vrátí strukturovaná data (položky, ceny, celková částka, datum, název obchodu). Tyto údaje předvyplní formulář pro vytvoření výdaje. Uživatel přiřadí členy k jednotlivým položkám a potvrdí — vytvoří se expense se splitem vypočítaným z položek.

## Datový model

### Nové tabulky

**`expense_items`**

| Sloupec    | Typ             | Popis                                           |
| ---------- | --------------- | ----------------------------------------------- |
| id         | uuid PK         | default gen_random_uuid()                       |
| expense_id | uuid FK → expenses(id) ON DELETE CASCADE |                              |
| name       | text NOT NULL   | Název položky ("Rohlík 3x")                     |
| price      | numeric(10,2) NOT NULL | Cena položky                               |
| position   | integer NOT NULL | Pořadí na účtence                               |

**`expense_item_members`**

| Sloupec    | Typ             | Popis                                           |
| ---------- | --------------- | ----------------------------------------------- |
| id         | uuid PK         | default gen_random_uuid()                       |
| item_id    | uuid FK → expense_items(id) ON DELETE CASCADE |                      |
| profile_id | uuid FK → profiles(id) |                                              |

### RLS politiky

Stejný vzor jako existující — authenticated uživatelé vidí/editují položky pro expenses ve svém flatu. Politiky na obou tabulkách kontrolují přes JOIN na `expenses.flat_id` a `flat_profile`.

### Výpočet expense_shares z položek

1. Pro každou položku: `podíl = price / počet_členů_na_položce`
2. Pro každého člena: `celkem = SUM(jeho podíly ze všech položek)`
3. Tyto částky se zapíší do `expense_shares` jako dosud
4. `expenses.amount` = součet všech položek

Stávající logika (view_flat_balances, settlement výpočty) zůstává beze změny — pracuje s `expense_shares`.

## Edge Function: `parse-receipt`

### Endpoint

`POST /functions/v1/parse-receipt`

### Autentizace

Ověření Supabase JWT tokenu z `Authorization` headeru. Neautorizované requesty odmítne.

### Request

```typescript
{ image_base64: string, currency: "CZK" }
```

### System prompt pro Claude Haiku 4.5

```
Jsi asistent pro čtení účtenek z obchodů. Analyzuj obrázek účtenky a vrať JSON.

Pravidla:
- Extrahuj POUZE řádkové položky nákupu (produkty/zboží)
- Ignoruj: DPH řádky, mezisoučty, platební metody, DIČ, IČO, zákaznické karty, slevy jako samostatné řádky (slevu zahrň do ceny položky)
- Pokud má položka množství (např. "3x 2,90"), uveď celkovou cenu (8,70)
- Ceny převeď na čísla (ne stringy)
- Datum ve formátu ISO (YYYY-MM-DD)
- Pokud něco nedokážeš přečíst, vynech to
- Pokud obrázek není účtenka, vrať {"error": "not_a_receipt"}
```

### Response

```typescript
{
  store_name: string | null,
  date: string | null,        // "2026-04-05" ISO formát
  items: Array<{
    name: string,
    price: number
  }>,
  total: number
}
```

### API klíč

Anthropic API key uložený jako Supabase secret (`ANTHROPIC_API_KEY`), nikdy na klientovi.

### Limity

- Max velikost obrázku: ~2MB base64
- Timeout: 30s (Edge Function limit)
- Chybové stavy: nevalidní obrázek, není účtenka, timeout

## UI Flow

### 1. ExpenseForm — tlačítko "Nahrát účtenku"

V horní části formuláře nové tlačítko s ikonou. Po kliknutí se otevře custom `BottomSheet` s titulkem "Nahrát účtenku" a dvěma možnostmi:
- **Vyfotit** (ikona `camera-outline`) — volá existující `takePhoto()` z `fileService.ts`
- **Vybrat z galerie** (ikona `image-outline`) — volá existující `pickGalleryPhoto()` z `fileService.ts`

Po výběru obrázku:
1. BottomSheet se zavře
2. Loading stav na formuláři ("Zpracovávám účtenku...")
3. Obrázek se komprimuje (`compressImage()`), převede na base64, pošle na Edge Function
4. Po odpovědi se předvyplní:
   - **Název** → `store_name` (fallback: "Účtenka")
   - **Částka** → `total`
   - **Datum** → `date` (pokud rozpoznáno)
   - **Split režim** → automaticky přepne na "Položky" a naplní seznam

### 2. ExpenseSplitSection — třetí režim "Položky"

Stávající switch Auto / Manual dostane třetí možnost: **"Položky"**.

V tomto režimu se zobrazí `ReceiptItemList`:
- Seznam položek, každá řádka obsahuje:
  - Název položky (text)
  - Cena (text)
  - Řada avatarů přiřazených členů (defaultně všichni členové flatu)
  - Klik na řádku → otevře `MemberSelectorSheet` v multi režimu
- Tlačítko **"+ Přidat položku"** pro ruční přidání
- Možnost smazat položku
- Celková suma na konci seznamu

Režim "Položky" je dostupný i bez nahrání účtenky — uživatel může ručně zadat položky.

### 3. Přiřazení členů k položkám

- Defaultně: všichni členové flatu jsou přiřazeni ke každé položce
- Klik na položku → otevře `MemberSelectorSheet` (multiple režim)
- Po zavření sheetu se u položky zobrazí pouze avatary vybraných členů (kompaktní)
- Cena položky se dělí rovně mezi přiřazené členy

### 4. Uložení

1. Z položek se vypočítají `expense_shares` (pro každého člena součet jeho podílů)
2. Uloží se: `expense` → `expense_items` + `expense_item_members` → `expense_shares`
3. Navigace zpět na finance

### Validace na klientovi

- `items` musí být neprázdné pole
- `total` musí být kladné číslo
- Pokud součet položek neodpovídá `total` (tolerance ±1 Kč) — uživatel vidí obě hodnoty a může ručně opravit

## Nové soubory

| Soubor | Účel |
|--------|------|
| `lib/receiptService.ts` | Komprese obrázku, konverze na base64, volání Edge Function, typy |
| `components/expenses/ReceiptItemList.tsx` | Seznam položek s avatary, MemberSelector integrace, přidání/smazání |
| `supabase/functions/parse-receipt/index.ts` | Edge Function — Claude Haiku 4.5 Vision |

## Změny existujících souborů

| Soubor | Změna |
|--------|-------|
| `components/expenses/ExpenseForm.tsx` | Tlačítko "Nahrát účtenku", BottomSheet, loading stav, předvyplnění polí, nový split režim "items", logika ukládání položek |
| `components/expenses/ExpenseSplitSection.tsx` | Třetí režim "Položky" ve switchi, renderování `ReceiptItemList` |
| `types/finance.ts` | Nové typy: `ExpenseItem`, `ExpenseItemMember`, `ReceiptParseResponse` |
| Nová migrace | Tabulky `expense_items`, `expense_item_members` + RLS politiky |

## Editace expense s položkami

Při editaci expense, který byl vytvořen v režimu "Položky":
- Načtou se existující `expense_items` a `expense_item_members` z DB
- Split režim se nastaví na "Položky"
- Uživatel může upravit/přidat/smazat položky a změnit přiřazení členů
- Při uložení se smažou staré `expense_items` (CASCADE smaže i `expense_item_members`) a vloží nové + přepočítají se `expense_shares`

## Co se NEMĚNÍ

- `finance.tsx` (hlavní obrazovka)
- `SettlementList.tsx`
- `view_flat_balances` — pořád počítá z `expense_shares`
- Stávající flow Auto/Manual splitu
- `fileService.ts` — používá se beze změny
