# Landlord Gate - blokace modulov bez pronajimatele

## Problem

Moduly Klice a Zavady slouzi ke komunikaci mezi najemcem a pronajimatelem. Pokud v byte neni zadny pronajimatel, tyto moduly nemaji smysl a uzivatel by mel byt informovan, ze musi pridat pronajimatele.

## Reseni

### 1. Hook `useFlatHasLandlord`

**Soubor:** `hooks/useFlatHasLandlord.ts`

- Ziska `currentFlat` z `useFlatContext()`
- Dotaz na Supabase: `flat_profile` kde `role = 'pronajimatel'`, `flat_id = currentFlat.id`, `active = true`, `limit(1)`
- Vraci `{ hasLandlord: boolean, isLoading: boolean }`
- Pouziva `useFocusEffect` — overuje stav pri kazdem focusu obrazovky

### 2. Obrazovky Keys a Issues

Obe obrazovky (`app/(tabs)/keys.tsx`, `app/(tabs)/issues.tsx`) zavolaji `useFlatHasLandlord()`.

Pokud `!hasLandlord && !isLoading`, misto obsahu se zobrazi fullscreen empty state:
- Ikona (`key-outline` / `warning-outline` dle obrazovky)
- Hlavni text: **"V domacnosti chybi pronajimatel"**
- Podtext: **"Pro pouzivani teto funkce musi byt v domacnosti alespon jeden pronajimatel."**
- FAB tlacitko se nezobrazi
- Loading spinner zustava beze zmeny

### 3. Dashboard widgety

`IssuesWidget` a `KeysWidget` zavolaji stejny hook. Pokud `!hasLandlord`, widget vrati `null` (nevyrenderuje se).

## Dotcene soubory

1. `hooks/useFlatHasLandlord.ts` — novy soubor
2. `app/(tabs)/keys.tsx` — pridani gate
3. `app/(tabs)/issues.tsx` — pridani gate
4. `components/dashboard_widgets/IssuesWidget.tsx` — skryti widgetu
5. `components/dashboard_widgets/KeysWidget.tsx` — skryti widgetu
