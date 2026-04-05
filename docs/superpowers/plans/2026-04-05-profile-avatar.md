# Profile Avatar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to upload, replace, or delete their profile avatar photo from the profile page.

**Architecture:** New `lib/avatarService.ts` with 3 functions (upload, delete, getUrl) reusing `compressImage()` from `fileService.ts`. Profile page gets a Pressable avatar with camera badge overlay and BottomSheet for action selection. No changes to existing files (`fileService.ts`, `avatar.tsx`).

**Tech Stack:** React Native, Expo Image Picker (existing), Supabase Storage (`avatars` bucket, existing), NativeWind

---

### Task 1: Create `lib/avatarService.ts`

**Files:**
- Create: `lib/avatarService.ts`

- [ ] **Step 1: Create avatarService with all three functions**

```typescript
import { readAsStringAsync } from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import { supabase } from "./supabase";
import { compressImage } from "./fileService";
import logger from "@/lib/logger";

/**
 * Nahraje avatar do Supabase Storage a aktualizuje profiles.avatar_url
 * @returns veřejná URL nahraného avataru
 */
export const uploadAvatar = async (
  userId: string,
  imageUri: string,
): Promise<string> => {
  // Komprese
  const compressedUri = await compressImage(imageUri);

  // Konverze na base64
  const base64 = await readAsStringAsync(compressedUri, {
    encoding: "base64",
  });
  const fileData = decode(base64);

  // Upload do storage s upsert
  const filePath = `${userId}/avatar.jpg`;
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, fileData, {
      contentType: "image/jpeg",
      upsert: true,
    });

  if (uploadError) {
    logger.error("Avatar upload error:", uploadError);
    throw uploadError;
  }

  // Získat veřejnou URL s cache-busting parametrem
  const publicUrl = getAvatarPublicUrl(filePath);

  // Update profilu
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", userId);

  if (updateError) {
    logger.error("Avatar URL update error:", updateError);
    throw updateError;
  }

  logger.log("Avatar nahrán:", publicUrl);
  return publicUrl;
};

/**
 * Smaže avatar ze storage (pokud je uložen v avatars bucketu) a vymaže avatar_url z profilu
 */
export const deleteAvatar = async (
  userId: string,
  currentUrl: string | null,
): Promise<void> => {
  // Smazat ze storage jen pokud je to náš bucket (ne externí URL z Google OAuth)
  if (currentUrl && currentUrl.includes("/storage/v1/object/public/avatars/")) {
    const filePath = `${userId}/avatar.jpg`;
    const { error: removeError } = await supabase.storage
      .from("avatars")
      .remove([filePath]);

    if (removeError) {
      logger.error("Avatar delete error:", removeError);
      throw removeError;
    }
  }

  // Vymazat z profilu
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: null })
    .eq("id", userId);

  if (updateError) {
    logger.error("Avatar URL clear error:", updateError);
    throw updateError;
  }

  logger.log("Avatar smazán pro uživatele:", userId);
};

/**
 * Vrátí veřejnou URL avataru s cache-busting parametrem
 */
export const getAvatarPublicUrl = (path: string): string => {
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
};
```

- [ ] **Step 2: Verify the file compiles**

Run: `npx tsc --noEmit lib/avatarService.ts` (or just check no red squiggles in editor)

- [ ] **Step 3: Commit**

```bash
git add lib/avatarService.ts
git commit -m "feat: add avatarService for upload/delete/getUrl"
```

---

### Task 2: Add avatar state and data fetching to profile page

**Files:**
- Modify: `app/profile.tsx:18-24` (Profile interface)
- Modify: `app/profile.tsx:62-79` (state declarations)
- Modify: `app/profile.tsx:99-112` (fetch query + state setting)

- [ ] **Step 1: Add avatar_url to Profile interface**

In `app/profile.tsx`, change the `Profile` interface at line 18:

```typescript
interface Profile {
  name: string | null;
  surname: string | null;
  email: string | null;
  iban: string | null;
  phone: string | null;
  avatar_url: string | null;
}
```

- [ ] **Step 2: Add new state variables**

After line 79 (`const [isSavingPhone, setIsSavingPhone] = useState(false);`), add:

```typescript
const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
const [avatarSheetVisible, setAvatarSheetVisible] = useState(false);
const [currentUserId, setCurrentUserId] = useState<string | null>(null);
```

- [ ] **Step 3: Update fetch query to include avatar_url and save userId**

Change the select at line 100 from:

```typescript
.select("name, surname, iban, phone")
```

to:

```typescript
.select("name, surname, iban, phone, avatar_url")
```

After `setIsOwnProfile(ownProfile);` (line 97), add:

```typescript
if (ownProfile && user?.id) {
  setCurrentUserId(user.id);
}
```

Update the `setProfile` call to include `avatar_url`:

```typescript
setProfile({
  name: data?.name ?? null,
  surname: data?.surname ?? null,
  email: ownProfile ? (user?.email ?? null) : null,
  iban: data?.iban ?? null,
  phone: data?.phone ?? null,
  avatar_url: data?.avatar_url ?? null,
});
setAvatarUrl(data?.avatar_url ?? null);
```

- [ ] **Step 4: Commit**

```bash
git add app/profile.tsx
git commit -m "feat: add avatar state and fetch avatar_url in profile"
```

---

### Task 3: Add avatar action handlers to profile page

**Files:**
- Modify: `app/profile.tsx` (imports + handler functions)

- [ ] **Step 1: Add imports**

Add to the existing imports at the top of `app/profile.tsx`:

```typescript
import { ActivityIndicator } from "react-native";  // add to existing RN import if not there
import { takePhoto, pickGalleryPhoto } from "@/lib/fileService";
import { uploadAvatar, deleteAvatar } from "@/lib/avatarService";
import BottomSheet from "@/components/shared/BottomSheet";
```

Note: `ActivityIndicator` is already imported on line 1. `Pressable` is already imported on line 1.

- [ ] **Step 2: Add handler functions**

After `handleSavePhone` function (around line 326), add:

```typescript
const handleAvatarAction = async (action: "camera" | "gallery" | "delete") => {
  setAvatarSheetVisible(false);

  if (!currentUserId) return;

  if (action === "delete") {
    setIsUploadingAvatar(true);
    try {
      await deleteAvatar(currentUserId, avatarUrl);
      setAvatarUrl(null);
      showToast("Profilová fotka byla smazána", "success");
    } catch {
      showToast("Nepodařilo se smazat fotku", "error");
    } finally {
      setIsUploadingAvatar(false);
    }
    return;
  }

  try {
    const uri =
      action === "camera" ? await takePhoto() : await pickGalleryPhoto();

    if (!uri) return;

    setIsUploadingAvatar(true);
    const publicUrl = await uploadAvatar(currentUserId, uri);
    setAvatarUrl(publicUrl);
    showToast("Profilová fotka byla aktualizována", "success");
  } catch (error: any) {
    showToast(
      error?.message || "Nepodařilo se nahrát fotku",
      "error",
    );
  } finally {
    setIsUploadingAvatar(false);
  }
};
```

- [ ] **Step 3: Commit**

```bash
git add app/profile.tsx
git commit -m "feat: add avatar upload/delete handlers in profile"
```

---

### Task 4: Update profile page UI — avatar with overlay + BottomSheet

**Files:**
- Modify: `app/profile.tsx:349-356` (avatar section in JSX)
- Modify: `app/profile.tsx:711-722` (before closing KeyboardAwareScrollView, add BottomSheet)

- [ ] **Step 1: Replace avatar section with Pressable + overlay**

Replace lines 349-356:

```jsx
{/* Avatar + jméno */}
<View className="items-center gap-3 pt-4">
  <Avatar name={profile?.name} size="xl" />
  <Text className="text-xl font-bold text-foreground">
    {displayName}
  </Text>
</View>
```

with:

```jsx
{/* Avatar + jméno */}
<View className="items-center gap-3 pt-4">
  {isOwnProfile ? (
    <Pressable
      onPress={() => setAvatarSheetVisible(true)}
      disabled={isUploadingAvatar}
    >
      <View>
        {isUploadingAvatar ? (
          <View className="w-10 h-10 rounded-full bg-primary items-center justify-center">
            <ActivityIndicator size="small" color="white" />
          </View>
        ) : (
          <Avatar
            name={profile?.name}
            imageUrl={avatarUrl}
            size="xl"
          />
        )}
        {/* Camera badge */}
        <View className="absolute -bottom-0.5 -right-0.5 bg-primary rounded-full w-4 h-4 items-center justify-center border-2 border-background">
          <Ionicons name="camera" size={9} color="white" />
        </View>
      </View>
    </Pressable>
  ) : (
    <Avatar
      name={profile?.name}
      imageUrl={avatarUrl}
      size="xl"
    />
  )}
  <Text className="text-xl font-bold text-foreground">
    {displayName}
  </Text>
</View>
```

- [ ] **Step 2: Add BottomSheet before closing KeyboardAwareScrollView**

Before the closing `</KeyboardAwareScrollView>` tag (line 722), add:

```jsx
<BottomSheet
  visible={avatarSheetVisible}
  onClose={() => setAvatarSheetVisible(false)}
  title="Profilová fotka"
>
  <View className="px-5 pb-4 gap-1">
    <Pressable
      className="flex-row items-center gap-4 py-3.5 px-2"
      onPress={() => handleAvatarAction("camera")}
    >
      <Ionicons
        name="camera-outline"
        size={24}
        className="text-foreground"
      />
      <Text className="text-base text-foreground">Vyfotit</Text>
    </Pressable>

    <Pressable
      className="flex-row items-center gap-4 py-3.5 px-2"
      onPress={() => handleAvatarAction("gallery")}
    >
      <Ionicons
        name="image-outline"
        size={24}
        className="text-foreground"
      />
      <Text className="text-base text-foreground">
        Vybrat z galerie
      </Text>
    </Pressable>

    {avatarUrl && (
      <Pressable
        className="flex-row items-center gap-4 py-3.5 px-2"
        onPress={() => handleAvatarAction("delete")}
      >
        <Ionicons
          name="trash-outline"
          size={24}
          className="text-destructive"
        />
        <Text className="text-base text-destructive">
          Smazat fotku
        </Text>
      </Pressable>
    )}
  </View>
</BottomSheet>
```

- [ ] **Step 3: Commit**

```bash
git add app/profile.tsx
git commit -m "feat: add avatar UI with camera overlay and BottomSheet"
```

---

### Task 5: Manual testing

**Files:** None (testing only)

- [ ] **Step 1: Test upload from gallery**

1. Run the app: `npm start`, open on device/emulator
2. Navigate to own profile
3. Tap the avatar — BottomSheet should appear with "Vyfotit", "Vybrat z galerie"
4. Choose "Vybrat z galerie" — pick a photo
5. Spinner should show on avatar during upload
6. Avatar should update with the photo
7. Toast "Profilová fotka byla aktualizována" should appear

- [ ] **Step 2: Test upload from camera**

1. Tap avatar again
2. Choose "Vyfotit" — take a photo
3. Avatar should update with the new photo

- [ ] **Step 3: Test delete**

1. Tap avatar — "Smazat fotku" option should now be visible
2. Choose "Smazat fotku"
3. Avatar should revert to initials
4. Toast "Profilová fotka byla smazána" should appear

- [ ] **Step 4: Test other profile view**

1. Navigate to another user's profile (from members widget or similar)
2. Avatar should show their photo (if they have one) or initials
3. No camera badge overlay should be visible
4. Tapping avatar should do nothing

- [ ] **Step 5: Test permission denied**

1. Deny camera/gallery permission when prompted
2. Toast with error message should appear
3. Avatar should remain unchanged
