# Flat Chat — Design Spec

## Overview

Skupinovy chat v ramci bytu pro komunikaci mezi najemci a pronajimatelem. Jeden chat na byt, realtime dorucovani zprav, read receipts.

## Pozadavky

- Jeden spolecny chat na byt (vsichni clenove)
- Pouze textove zpravy, bez editace a mazani
- Realtime dorucovani pres Supabase Postgres Changes
- Read receipts — viditelne kdo precetl az kam
- In-app notifikace (badge s poctem neprectenych), push notifikace mimo scope
- Zadne specialni headery — standardni TopBar v tabs, zpet button ve stacku

## Navigace

### Pronajimatel — bottom bar

Domu | Zavady | **Chat** | **Dalsi**

- Chat je samostatny tab
- Dalsi obsahuje: Klice, Dokumenty, nastaveni

### Najemce — bottom bar (beze zmeny)

Domu | Finance | Ukoly | Dalsi

- Chat pristupny ze stranky Dalsi jako polozka v seznamu

### Routing

- `app/(tabs)/chat.tsx` — tab screen pro pronajimatele
- `app/chat.tsx` — stack screen pristupny z Dalsi pro najemce
- Oba renderuji stejnou komponentu (sdileny `components/chat/ChatScreen.tsx`)

## Datovy model

### Tabulka `messages`

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flat_id UUID NOT NULL REFERENCES flats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_flat_created ON messages (flat_id, created_at DESC);
```

### Tabulka `message_reads`

Jeden radek na uzivatele/byt. Sleduje cas posledniho cteni — ne per-message.

```sql
CREATE TABLE message_reads (
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  flat_id UUID NOT NULL REFERENCES flats(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, flat_id)
);
```

### RLS policies

- `messages` SELECT: uzivatel je aktivni clen bytu (`EXISTS (SELECT 1 FROM flat_profile WHERE profile_id = auth.uid() AND flat_id = messages.flat_id AND active = true)`)
- `messages` INSERT: stejne jako SELECT + sender_id = auth.uid()
- `message_reads` SELECT: profile_id = auth.uid() OR uzivatel je clen stejneho bytu (pro zobrazeni read receipts ostatnich)
- `message_reads` UPSERT: profile_id = auth.uid()

## Realtime

### Subscription

Pri mount chat obrazovky:

```typescript
supabase.channel(`chat:${flatId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `flat_id=eq.${flatId}`
  }, handleNewMessage)
  .subscribe()
```

Unsubscribe pri unmount.

### Optimistic update

Pri odeslani zpravy se zprava okamzite prida do lokalniho seznamu. Pokud INSERT selze, zprava se odstrani a zobrazi se toast s chybou.

## Data Flow

### Nacteni historie

- Pri otevreni: poslednich 50 zprav s joinem na `profiles` (jmeno, prijmeni, avatar)
- Paginace: scroll nahoru = dalsi page (50 zprav), loading indicator nahore
- Dotaz: `.from("messages").select("*, sender:profiles!messages_sender_id_fkey(id, name, surname, avatar_url)").eq("flat_id", flatId).order("created_at", { ascending: false }).limit(50)`

### Read receipts

- **Aktualizace**: UPSERT do `message_reads` pri otevreni chatu a pri kazde nove zprave (kdyz je chat otevreny)
- **Zobrazeni**: dotaz na `message_reads` pro vsechny cleny bytu. U kazdeho clena `last_read_at` urcuje posledni zpravu kterou precetl
- **Vizual**: male avatary clenu pod posledni zpravou kterou precetli (iMessage styl)

### Badge neprectenych

- Dotaz: posledni zprava v bytu vs. muj `last_read_at`
- Pocet: `COUNT(*) FROM messages WHERE flat_id = X AND created_at > last_read_at`
- Refresh pres `useFocusEffect` na relevantnich obrazovkach (Home, Dalsi, tab bar)

## UI komponenty

### ChatScreen (`components/chat/ChatScreen.tsx`)

Sdilena komponenta pouzita jak v tab screenu tak ve stack screenu.

- **FlatList (inverted)** — nejnovejsi zpravy dole, scroll nahoru pro historii
- **Input bar** dole — TextInput + Send button
- **Prazdny stav** — ilustrace + "Zahajte konverzaci"

### Zpravy

- Moje zpravy: zarovnane vpravo, primary barva (purple)
- Cizi zpravy: zarovnane vlevo, seda barva
- Avatar odesilatele vlevo u cizich zprav
- Jmeno odesilatele nad skupinou zprav od stejneho cloveka
- Casova znacka u zprav
- Shlukovani: zpravy od stejneho odesilatele v kratkem casovem rozmezi se shluknou (jmeno + avatar jen u prvni)

### Read receipts vizual

- Male avatary (xs velikost) pod posledni zpravou kterou dany clen precetl
- Zobrazuji se jen u poslednich zprav (ne u kazde zpravy v historii)

## Zmeny v existujicim kodu

### Tab layout (`app/(tabs)/_layout.tsx`)

- Pronajimatel: odebrat Klice a Dokumenty z tabu, pridat Chat a Dalsi
- Najemce: beze zmeny

### Stranka Dalsi (`app/(tabs)/more.tsx`)

- Najemce: pridat polozku Chat (navigace na `app/chat.tsx`)
- Pronajimatel: pridat polozky Klice a Dokumenty (presunute z tabu)

## Mimo scope

- Push notifikace (externi)
- Posilani fotek/souboru
- Editace a mazani zprav
- Typing indikatory
- Reakce na zpravy
- Hledani ve zpravach
