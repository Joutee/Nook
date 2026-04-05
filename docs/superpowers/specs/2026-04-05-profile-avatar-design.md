# Profile Avatar — Design Spec

## Shrnutí

Uživatel si může nastavit vlastní profilovou fotku — vyfotit kamerou nebo vybrat z galerie. Fotka je globální (jedna pro celý účet, ne per-flat). Lze ji kdykoliv nahradit nebo smazat (vrátí se k iniciálám).

## Datový tok

1. Uživatel klepne na avatar → otevře se `BottomSheet` s možnostmi
2. Vybere "Vyfotit" nebo "Vybrat z galerie"
3. `takePhoto()` / `pickGalleryPhoto()` z `lib/fileService.ts` vrátí URI (beze změn)
4. `compressImage()` z `lib/fileService.ts` zmenší na 1080px JPEG 60% (beze změn)
5. Upload do `avatars` bucketu: cesta `{userId}/avatar.jpg`, `upsert: true`
6. Získá public URL přes `supabase.storage.from("avatars").getPublicUrl()`
7. Update `profiles.avatar_url` s veřejnou URL
8. UI se aktualizuje

### Smazání

1. Pokud `avatar_url` odkazuje na `avatars` bucket → smazat soubor ze storage
2. Pokud je to externí URL (Google OAuth) → jen smazat z DB, nic ze storage
3. Set `profiles.avatar_url = null`
4. Avatar se vrátí k iniciálám

## UI

### Avatar s edit overlay (jen vlastní profil)

- Stávající `<Avatar>` komponenta obalená v `<Pressable>`
- Fialový kroužek s ikonkou fotoaparátu (Ionicons `camera`) vpravo dole — absolutně pozicovaný
- Při prohlížení cizího profilu se overlay nezobrazí

### BottomSheet

Použije existující `components/shared/BottomSheet.tsx` s title "Profilová fotka":

- **Vyfotit** — Ionicons `camera-outline` + text
- **Vybrat z galerie** — Ionicons `image-outline` + text
- **Smazat fotku** — Ionicons `trash-outline` + červený text (jen pokud avatar_url existuje)

### Loading stav

- Spinner místo avataru během uploadu
- BottomSheet se zavře ihned po výběru fotky

## Nové soubory

### `lib/avatarService.ts`

Tři funkce:

- `uploadAvatar(userId: string, imageUri: string): Promise<string>` — komprese přes `compressImage()`, upload do `avatars/{userId}/avatar.jpg` s upsert, update `profiles.avatar_url`, vrátí public URL
- `deleteAvatar(userId: string, currentUrl: string | null): Promise<void>` — pokud URL obsahuje `avatars` bucket path → smazat ze storage; set `profiles.avatar_url = null`
- `getAvatarPublicUrl(path: string): string` — wrapper přes `supabase.storage.from("avatars").getPublicUrl()`

Reusuje `compressImage()` z `lib/fileService.ts`. Nemodifikuje stávající `uploadFile()`.

## Upravené soubory

### `app/profile.tsx`

- Přidat do selectu: `avatar_url`
- Nové stavy: `avatarUrl: string | null`, `isUploadingAvatar: boolean`, `avatarSheetVisible: boolean`
- `<Pressable>` wrapper kolem `<Avatar>` (jen `isOwnProfile`)
- Camera badge overlay (absolutně pozicovaný Ionicons)
- Handler pro akce z BottomSheetu
- Předat `imageUrl={avatarUrl}` do `<Avatar>`
- Loading spinner přes avatar během uploadu

### Beze změn

- `components/ui/avatar.tsx` — už podporuje `imageUrl` prop
- `lib/fileService.ts` — reusujeme `compressImage()`, `takePhoto()`, `pickGalleryPhoto()` as-is
- `avatars` storage bucket — už existuje, public read
- `profiles.avatar_url` sloupec — už existuje v DB

## Error handling

| Situace | Chování |
|---------|---------|
| Permission denied (kamera/galerie) | Toast "Přístup k fotoaparátu/fotkám byl odepřen" |
| Upload selže | Toast "Nepodařilo se nahrát fotku", avatar beze změny |
| Smazání selže | Toast "Nepodařilo se smazat fotku" |
| Velký soubor | `compressImage()` řeší automaticky |
| Pomalá síť | Spinner na avataru, disabled interakce |
| Google OAuth avatar + smazání | Jen `avatar_url = null`, nic ze storage |
