# Receipt OCR Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add receipt scanning to the finance module — users photograph/upload a receipt, Claude Haiku 4.5 Vision extracts items via Supabase Edge Function, and items are displayed in a new "Položky" split mode where users assign members to each item before creating the expense.

**Architecture:** Image captured on client → compressed + base64 → sent to Supabase Edge Function `parse-receipt` → Edge Function calls Claude Haiku 4.5 Vision API → structured JSON returned → populates new "items" split mode in ExpenseForm → on save, items stored in `expense_items` + `expense_item_members` tables, shares computed and saved to `expense_shares`.

**Tech Stack:** React Native/Expo, Supabase Edge Functions (Deno), Claude Haiku 4.5 Vision API, existing fileService.ts utilities

---

### Task 1: Database migration — expense_items and expense_item_members

**Files:**
- Create: `supabase/migrations/20260405100000_expense_items.sql`

- [ ] **Step 1: Create migration file**

```sql
-- ============================================================
-- Expense Items (receipt line items)
-- ============================================================

CREATE TABLE IF NOT EXISTS "public"."expense_items" (
    "id"         uuid           DEFAULT gen_random_uuid() NOT NULL,
    "expense_id" uuid           NOT NULL,
    "name"       text           NOT NULL,
    "price"      numeric(10,2)  NOT NULL,
    "position"   integer        NOT NULL,
    CONSTRAINT "expense_items_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "public"."expense_items" OWNER TO "postgres";

ALTER TABLE ONLY "public"."expense_items"
    ADD CONSTRAINT "expense_items_expense_id_fkey"
        FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "idx_expense_items_expense_id"
    ON "public"."expense_items" USING btree ("expense_id");

-- ============================================================
-- Expense Item Members (who owns each item)
-- ============================================================

CREATE TABLE IF NOT EXISTS "public"."expense_item_members" (
    "id"         uuid  DEFAULT gen_random_uuid() NOT NULL,
    "item_id"    uuid  NOT NULL,
    "profile_id" uuid  NOT NULL,
    CONSTRAINT "expense_item_members_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "public"."expense_item_members" OWNER TO "postgres";

ALTER TABLE ONLY "public"."expense_item_members"
    ADD CONSTRAINT "expense_item_members_item_id_fkey"
        FOREIGN KEY ("item_id") REFERENCES "public"."expense_items"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."expense_item_members"
    ADD CONSTRAINT "expense_item_members_profile_id_fkey"
        FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "idx_expense_item_members_item_id"
    ON "public"."expense_item_members" USING btree ("item_id");

-- ============================================================
-- RLS policies — expense_items
-- ============================================================

ALTER TABLE "public"."expense_items" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view expense items in their flat"
    ON "public"."expense_items"
    FOR SELECT TO "authenticated"
    USING (EXISTS (
        SELECT 1
        FROM "public"."expenses" e
        JOIN "public"."flat_profile" fp ON fp.flat_id = e.flat_id
        WHERE e.id = "expense_items"."expense_id"
          AND fp.profile_id = auth.uid()
          AND fp.active = true
    ));

CREATE POLICY "Members can create expense items in their flat"
    ON "public"."expense_items"
    FOR INSERT TO "authenticated"
    WITH CHECK (EXISTS (
        SELECT 1
        FROM "public"."expenses" e
        JOIN "public"."flat_profile" fp ON fp.flat_id = e.flat_id
        WHERE e.id = "expense_items"."expense_id"
          AND fp.profile_id = auth.uid()
          AND fp.active = true
    ));

CREATE POLICY "Members can update expense items in their flat"
    ON "public"."expense_items"
    FOR UPDATE TO "authenticated"
    USING (EXISTS (
        SELECT 1
        FROM "public"."expenses" e
        JOIN "public"."flat_profile" fp ON fp.flat_id = e.flat_id
        WHERE e.id = "expense_items"."expense_id"
          AND fp.profile_id = auth.uid()
          AND fp.active = true
    ))
    WITH CHECK (EXISTS (
        SELECT 1
        FROM "public"."expenses" e
        JOIN "public"."flat_profile" fp ON fp.flat_id = e.flat_id
        WHERE e.id = "expense_items"."expense_id"
          AND fp.profile_id = auth.uid()
          AND fp.active = true
    ));

CREATE POLICY "Members can delete expense items in their flat"
    ON "public"."expense_items"
    FOR DELETE TO "authenticated"
    USING (EXISTS (
        SELECT 1
        FROM "public"."expenses" e
        JOIN "public"."flat_profile" fp ON fp.flat_id = e.flat_id
        WHERE e.id = "expense_items"."expense_id"
          AND fp.profile_id = auth.uid()
          AND fp.active = true
    ));

-- ============================================================
-- RLS policies — expense_item_members
-- ============================================================

ALTER TABLE "public"."expense_item_members" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view expense item members in their flat"
    ON "public"."expense_item_members"
    FOR SELECT TO "authenticated"
    USING (EXISTS (
        SELECT 1
        FROM "public"."expense_items" ei
        JOIN "public"."expenses" e ON e.id = ei.expense_id
        JOIN "public"."flat_profile" fp ON fp.flat_id = e.flat_id
        WHERE ei.id = "expense_item_members"."item_id"
          AND fp.profile_id = auth.uid()
          AND fp.active = true
    ));

CREATE POLICY "Members can create expense item members in their flat"
    ON "public"."expense_item_members"
    FOR INSERT TO "authenticated"
    WITH CHECK (EXISTS (
        SELECT 1
        FROM "public"."expense_items" ei
        JOIN "public"."expenses" e ON e.id = ei.expense_id
        JOIN "public"."flat_profile" fp ON fp.flat_id = e.flat_id
        WHERE ei.id = "expense_item_members"."item_id"
          AND fp.profile_id = auth.uid()
          AND fp.active = true
    ));

CREATE POLICY "Members can delete expense item members in their flat"
    ON "public"."expense_item_members"
    FOR DELETE TO "authenticated"
    USING (EXISTS (
        SELECT 1
        FROM "public"."expense_items" ei
        JOIN "public"."expenses" e ON e.id = ei.expense_id
        JOIN "public"."flat_profile" fp ON fp.flat_id = e.flat_id
        WHERE ei.id = "expense_item_members"."item_id"
          AND fp.profile_id = auth.uid()
          AND fp.active = true
    ));
```

- [ ] **Step 2: Apply migration to Supabase**

Run the migration via Supabase dashboard (SQL Editor) or CLI:
```bash
supabase db push
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260405100000_expense_items.sql
git commit -m "feat: add expense_items and expense_item_members tables with RLS"
```

---

### Task 2: TypeScript types

**Files:**
- Modify: `types/finance.ts`

- [ ] **Step 1: Add new types to types/finance.ts**

Add these types at the end of `types/finance.ts` (after the existing `RecurringExpenseWithDetails` interface):

```typescript
export interface ExpenseItem {
  id?: string;
  name: string;
  price: number;
  position: number;
  memberIds: string[];
}

export interface ReceiptParseResponse {
  store_name: string | null;
  date: string | null;
  items: Array<{
    name: string;
    price: number;
  }>;
  total: number;
}

export interface ReceiptParseError {
  error: string;
}
```

Note: `ExpenseItem` has an optional `id` (absent for new items, present when loaded from DB). `memberIds` is a client-side field — in DB these are stored in `expense_item_members`.

- [ ] **Step 2: Commit**

```bash
git add types/finance.ts
git commit -m "feat: add ExpenseItem and ReceiptParseResponse types"
```

---

### Task 3: Receipt service — client-side image processing and Edge Function call

**Files:**
- Create: `lib/receiptService.ts`

- [ ] **Step 1: Create lib/receiptService.ts**

```typescript
import { readAsStringAsync } from "expo-file-system/legacy";
import { supabase } from "@/lib/supabase";
import { compressImage } from "@/lib/fileService";
import { ReceiptParseResponse } from "@/types/finance";
import logger from "@/lib/logger";

/**
 * Compresses an image and converts it to base64 string.
 */
const imageToBase64 = async (uri: string): Promise<string> => {
  const compressedUri = await compressImage(uri);
  const base64 = await readAsStringAsync(compressedUri, {
    encoding: "base64",
  });
  return base64;
};

/**
 * Sends a receipt image to the parse-receipt Edge Function
 * and returns structured item data.
 */
export const parseReceipt = async (
  imageUri: string,
): Promise<ReceiptParseResponse> => {
  const base64 = await imageToBase64(imageUri);

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Nejste přihlášeni");
  }

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
  const response = await fetch(
    `${supabaseUrl}/functions/v1/parse-receipt`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        image_base64: base64,
        currency: "CZK",
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    logger.error("Edge Function error:", errorText);
    throw new Error("Nepodařilo se zpracovat účtenku");
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(
      data.error === "not_a_receipt"
        ? "Obrázek neobsahuje účtenku"
        : "Nepodařilo se rozpoznat účtenku",
    );
  }

  if (!data.items || data.items.length === 0) {
    throw new Error("Na účtence nebyly nalezeny žádné položky");
  }

  return data as ReceiptParseResponse;
};
```

- [ ] **Step 2: Commit**

```bash
git add lib/receiptService.ts
git commit -m "feat: add receiptService for image processing and Edge Function call"
```

---

### Task 4: Supabase Edge Function — parse-receipt

**Files:**
- Create: `supabase/functions/parse-receipt/index.ts`

This is a Deno-based Supabase Edge Function. It does NOT use Node.js imports — it uses Deno-style imports and the Web standard `Request`/`Response` API.

- [ ] **Step 1: Create supabase/functions/parse-receipt/index.ts**

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

const SYSTEM_PROMPT = `Jsi asistent pro čtení účtenek z obchodů. Analyzuj obrázek účtenky a vrať POUZE validní JSON bez jakéhokoli dalšího textu.

Pravidla:
- Extrahuj POUZE řádkové položky nákupu (produkty/zboží)
- Ignoruj: DPH řádky, mezisoučty, platební metody, DIČ, IČO, zákaznické karty, slevy jako samostatné řádky (slevu zahrň do ceny položky)
- Pokud má položka množství (např. "3x 2,90"), uveď celkovou cenu (8,70)
- Ceny převeď na čísla (ne stringy)
- Datum ve formátu ISO (YYYY-MM-DD)
- Pokud něco nedokážeš přečíst, vynech to
- Pokud obrázek není účtenka, vrať {"error": "not_a_receipt"}

Formát odpovědi:
{
  "store_name": "Název obchodu nebo null",
  "date": "YYYY-MM-DD nebo null",
  "items": [
    {"name": "Název položky", "price": 12.90}
  ],
  "total": 123.45
}`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  if (!ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    const { image_base64 } = await req.json();

    if (!image_base64) {
      return new Response(
        JSON.stringify({ error: "image_base64 is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const anthropicResponse = await fetch(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: "image/jpeg",
                    data: image_base64,
                  },
                },
                {
                  type: "text",
                  text: "Přečti tuto účtenku a vrať JSON s položkami.",
                },
              ],
            },
          ],
        }),
      },
    );

    if (!anthropicResponse.ok) {
      const errorText = await anthropicResponse.text();
      console.error("Anthropic API error:", errorText);
      return new Response(
        JSON.stringify({ error: "AI processing failed" }),
        { status: 502, headers: { "Content-Type": "application/json" } },
      );
    }

    const anthropicData = await anthropicResponse.json();
    const textContent = anthropicData.content?.find(
      (c: { type: string }) => c.type === "text",
    );

    if (!textContent?.text) {
      return new Response(
        JSON.stringify({ error: "No response from AI" }),
        { status: 502, headers: { "Content-Type": "application/json" } },
      );
    }

    // Parse the JSON from Claude's response — strip markdown fences if present
    let jsonText = textContent.text.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const parsed = JSON.parse(jsonText);

    return new Response(JSON.stringify(parsed), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Edge Function error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
```

- [ ] **Step 2: Set the Anthropic API key as a Supabase secret**

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-your-key-here
```

- [ ] **Step 3: Deploy the Edge Function**

```bash
supabase functions deploy parse-receipt
```

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/parse-receipt/index.ts
git commit -m "feat: add parse-receipt Edge Function with Claude Haiku 4.5 Vision"
```

---

### Task 5: ReceiptItemList component

**Files:**
- Create: `components/expenses/ReceiptItemList.tsx`

This component renders the list of receipt items with member avatars, and handles adding/removing items and opening the MemberSelectorSheet.

- [ ] **Step 1: Create components/expenses/ReceiptItemList.tsx**

```tsx
import React, { useState } from "react";
import { View, Pressable } from "react-native";
import { Text } from "@/components/ui/text";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Ionicons } from "@expo/vector-icons";
import { MemberSelectorSheet } from "@/components/shared/MemberSelectorSheet";
import { Member } from "@/types/members";
import { ExpenseItem } from "@/types/finance";
import { formatCurrency } from "@/lib/financeUtils";

interface ReceiptItemListProps {
  items: ExpenseItem[];
  onItemsChange: (items: ExpenseItem[]) => void;
  flatMembers: Member[];
}

export const ReceiptItemList: React.FC<ReceiptItemListProps> = ({
  items,
  onItemsChange,
  flatMembers,
}) => {
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

  const handleMemberToggle = (member: Member) => {
    if (editingItemIndex === null) return;

    const item = items[editingItemIndex];
    const hasMember = item.memberIds.includes(member.id);

    const updatedItems = [...items];
    updatedItems[editingItemIndex] = {
      ...item,
      memberIds: hasMember
        ? item.memberIds.filter((id) => id !== member.id)
        : [...item.memberIds, member.id],
    };
    onItemsChange(updatedItems);
  };

  const handleNameChange = (index: number, name: string) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], name };
    onItemsChange(updatedItems);
  };

  const handlePriceChange = (index: number, priceStr: string) => {
    const updatedItems = [...items];
    const price = parseFloat(priceStr) || 0;
    updatedItems[index] = { ...updatedItems[index], price };
    onItemsChange(updatedItems);
  };

  const handleRemoveItem = (index: number) => {
    const updatedItems = items
      .filter((_, i) => i !== index)
      .map((item, i) => ({ ...item, position: i }));
    onItemsChange(updatedItems);
  };

  const handleAddItem = () => {
    const newItem: ExpenseItem = {
      name: "",
      price: 0,
      position: items.length,
      memberIds: flatMembers.map((m) => m.id),
    };
    onItemsChange([...items, newItem]);
  };

  const getSelectedMembersForItem = (item: ExpenseItem): Member[] => {
    return flatMembers.filter((m) => item.memberIds.includes(m.id));
  };

  const total = items.reduce((sum, item) => sum + item.price, 0);

  return (
    <View>
      {items.map((item, index) => (
        <View
          key={index}
          className="mb-2 bg-secondary rounded-lg p-3"
        >
          <View className="flex-row items-center justify-between mb-1">
            <View className="flex-1 mr-2">
              <Input
                value={item.name}
                onChangeText={(val) => handleNameChange(index, val)}
                placeholder="Název položky"
                className="text-sm h-8"
              />
            </View>
            <View className="w-24 mr-2">
              <Input
                value={item.price > 0 ? item.price.toString() : ""}
                onChangeText={(val) => handlePriceChange(index, val)}
                placeholder="0.00"
                keyboardType="decimal-pad"
                className="text-sm h-8 text-right"
              />
            </View>
            <Pressable onPress={() => handleRemoveItem(index)} className="p-1">
              <Ionicons
                name="close-circle-outline"
                size={20}
                className="text-destructive"
              />
            </Pressable>
          </View>

          <Pressable
            onPress={() => setEditingItemIndex(index)}
            className="flex-row items-center gap-1 mt-1"
          >
            <View className="flex-row flex-1">
              {getSelectedMembersForItem(item).length === 0 ? (
                <Text className="text-xs text-muted-foreground italic">
                  Klikněte pro přiřazení členů
                </Text>
              ) : (
                <View className="flex-row items-center gap-0.5 flex-wrap">
                  {getSelectedMembersForItem(item).map((member) => (
                    <Avatar
                      key={member.id}
                      name={member.name}
                      imageUrl={member.avatar_url}
                      size="sm"
                    />
                  ))}
                  <Text className="text-xs text-muted-foreground ml-1">
                    {formatCurrency(
                      item.price / (item.memberIds.length || 1),
                    )}
                    /os.
                  </Text>
                </View>
              )}
            </View>
            <Ionicons
              name="people-outline"
              size={16}
              className="text-muted-foreground"
            />
          </Pressable>
        </View>
      ))}

      <Pressable
        onPress={handleAddItem}
        className="flex-row items-center justify-center gap-2 py-3 border border-dashed border-border rounded-lg mb-2"
      >
        <Ionicons
          name="add-circle-outline"
          size={20}
          className="text-primary"
        />
        <Text className="text-primary text-sm font-medium">
          Přidat položku
        </Text>
      </Pressable>

      <Text className="text-sm text-muted-foreground font-light italic">
        Celkem: {formatCurrency(total)}
      </Text>

      {editingItemIndex !== null && (
        <MemberSelectorSheet
          visible={true}
          onClose={() => setEditingItemIndex(null)}
          members={flatMembers}
          selectedMembers={getSelectedMembersForItem(items[editingItemIndex])}
          onToggleMember={handleMemberToggle}
          multiSelect={true}
          title="Kdo platí tuto položku?"
        />
      )}
    </View>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add components/expenses/ReceiptItemList.tsx
git commit -m "feat: add ReceiptItemList component with member assignment"
```

---

### Task 6: Update ExpenseSplitSection — add "Položky" split mode

**Files:**
- Modify: `components/expenses/ExpenseSplitSection.tsx`

The switch currently toggles between Auto and Manual. We need to change it to a three-option segmented control. The split mode type changes from `"auto" | "manual"` to `"auto" | "manual" | "items"`.

- [ ] **Step 1: Update ExpenseSplitSectionProps interface and add items props**

In `components/expenses/ExpenseSplitSection.tsx`, replace the interface (lines 12-24) and imports:

Replace the imports (lines 1-10):
```typescript
import React from "react";
import { View, Pressable } from "react-native";
import { Text } from "@/components/ui/text";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Member } from "@/types/members";
import { ExpenseItem } from "@/types/finance";
import { formatCurrency } from "@/lib/financeUtils";
import { Avatar } from "@/components/ui/avatar";
import { ReceiptItemList } from "@/components/expenses/ReceiptItemList";
```

Note: Remove the `Switch` import and the unused `Card, CardContent` import since we replaced the switch with a segmented control.

Replace the interface (lines 12-24):
```typescript
interface ExpenseSplitSectionProps {
  flatMembers: Member[];
  selectedMembers: Member[];
  onSelectedMembersChange: (members: Member[]) => void;
  splitMode: "auto" | "manual" | "items";
  onSplitModeChange: (mode: "auto" | "manual" | "items") => void;
  amount: string;
  onAmountChange: (amount: string) => void;
  manualAmounts: Record<string, string>;
  onManualAmountsChange: (amounts: Record<string, string>) => void;
  touchedMembers: Set<string>;
  onTouchedMembersChange: (touched: Set<string>) => void;
  expenseItems: ExpenseItem[];
  onExpenseItemsChange: (items: ExpenseItem[]) => void;
}
```

- [ ] **Step 2: Add expenseItems and onExpenseItemsChange to destructured props**

In the component function signature (line 26-38), add the new props:

Replace the destructured props block:
```typescript
export const ExpenseSplitSection: React.FC<ExpenseSplitSectionProps> = ({
  flatMembers,
  selectedMembers,
  onSelectedMembersChange,
  splitMode,
  onSplitModeChange,
  amount,
  onAmountChange,
  manualAmounts,
  onManualAmountsChange,
  touchedMembers,
  onTouchedMembersChange,
  expenseItems,
  onExpenseItemsChange,
}) => {
```

- [ ] **Step 3: Replace the Switch with a three-option segmented control**

Replace the switch section (lines 182-191) — the `<View className="flex-row justify-between...">` block:

```tsx
      <View className="mb-2">
        <Label className="mb-2">Rozdělit mezi</Label>
        <View className="flex-row bg-secondary rounded-lg p-0.5">
          {(["auto", "manual", "items"] as const).map((mode) => (
            <Pressable
              key={mode}
              onPress={() => {
                if (mode === "manual") {
                  handleSplitModeChange(true);
                } else if (mode === "auto") {
                  handleSplitModeChange(false);
                } else {
                  onSplitModeChange("items");
                }
              }}
              className={`flex-1 py-2 rounded-md items-center ${
                splitMode === mode ? "bg-primary" : ""
              }`}
            >
              <Text
                className={`text-xs font-medium ${
                  splitMode === mode
                    ? "text-primary-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {mode === "auto"
                  ? "Rovným dílem"
                  : mode === "manual"
                    ? "Ručně"
                    : "Položky"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
```

- [ ] **Step 4: Add items mode rendering**

After the manual mode summary text (after line 277, before the closing `</View>`), add the items mode render block:

```tsx
      {splitMode === "items" && (
        <ReceiptItemList
          items={expenseItems}
          onItemsChange={onExpenseItemsChange}
          flatMembers={flatMembers}
        />
      )}
```

Also, wrap the existing `flatMembers.map(...)` block (lines 193-240) and both summary text blocks (lines 242-277) so they only render when `splitMode !== "items"`:

Wrap lines 193-277 with:
```tsx
      {splitMode !== "items" && (
        <>
          {/* existing flatMembers.map and summary texts */}
        </>
      )}
```

- [ ] **Step 5: Commit**

```bash
git add components/expenses/ExpenseSplitSection.tsx
git commit -m "feat: add 'Položky' split mode to ExpenseSplitSection"
```

---

### Task 7: Update ExpenseForm — receipt upload, items state, save logic

**Files:**
- Modify: `components/expenses/ExpenseForm.tsx`

This is the biggest change. We add:
1. Receipt upload button + BottomSheet for source selection
2. `expenseItems` state
3. Loading state for receipt processing
4. Pre-fill logic from receipt response
5. Save logic for items mode (save expense_items + expense_item_members + computed expense_shares)

- [ ] **Step 1: Add imports**

Add these imports at the top of `components/expenses/ExpenseForm.tsx` (after existing imports):

```typescript
import BottomSheet from "@/components/shared/BottomSheet";
import { takePhoto, pickGalleryPhoto } from "@/lib/fileService";
import { parseReceipt } from "@/lib/receiptService";
import { ExpenseItem } from "@/types/finance";
```

- [ ] **Step 2: Update initialData type and splitMode state**

In the `ExpenseFormProps` interface (line 27-39), update `splitMode` type in `initialData`:

```typescript
    splitMode: "auto" | "manual" | "items";
```

Update the `splitMode` state (line 61-63):

```typescript
  const [splitMode, setSplitMode] = useState<"auto" | "manual" | "items">(
    initialData?.splitMode || "auto",
  );
```

- [ ] **Step 3: Add new state variables**

After the existing state declarations (after line 73, after the `customDays` state), add:

```typescript
  const [expenseItems, setExpenseItems] = useState<ExpenseItem[]>([]);
  const [showReceiptSheet, setShowReceiptSheet] = useState(false);
  const [isParsingReceipt, setIsParsingReceipt] = useState(false);
```

- [ ] **Step 4: Add receipt handling functions**

After the `formatDate` function (after line 172), add:

```typescript
  const handleReceiptImage = async (imageUri: string | null) => {
    if (!imageUri) return;

    setShowReceiptSheet(false);
    setIsParsingReceipt(true);

    try {
      const result = await parseReceipt(imageUri);

      // Pre-fill form fields
      if (result.store_name) {
        setTitle(result.store_name);
      }
      if (result.date) {
        const parsedDate = new Date(result.date);
        if (!isNaN(parsedDate.getTime())) {
          setDate(parsedDate);
        }
      }
      setAmount(result.total.toFixed(2));

      // Convert to ExpenseItems with all members assigned by default
      const allMemberIds = flatMembers.map((m) => m.id);
      const items: ExpenseItem[] = result.items.map((item, index) => ({
        name: item.name,
        price: item.price,
        position: index,
        memberIds: [...allMemberIds],
      }));

      setExpenseItems(items);
      setSplitMode("items");

      showToast("Účtenka byla načtena", "success");
    } catch (error: any) {
      showToast(error.message || "Nepodařilo se zpracovat účtenku", "error");
    } finally {
      setIsParsingReceipt(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const uri = await takePhoto();
      handleReceiptImage(uri);
    } catch (error: any) {
      showToast(error.message, "error");
    }
  };

  const handlePickGallery = async () => {
    try {
      const uri = await pickGalleryPhoto();
      handleReceiptImage(uri);
    } catch (error: any) {
      showToast(error.message, "error");
    }
  };
```

- [ ] **Step 5: Add items split mode to validation in handleSave**

In `handleSave`, after the manual mode validation block (after line 258, before `if (!currentFlat?.id)`), add items mode validation:

```typescript
    // Validate items mode
    if (splitMode === "items") {
      if (expenseItems.length === 0) {
        showToast("Přidejte alespoň jednu položku", "error");
        return;
      }
      for (const item of expenseItems) {
        if (!item.name.trim()) {
          showToast("Vyplňte název u všech položek", "error");
          return;
        }
        if (item.price <= 0) {
          showToast(`Zadejte platnou cenu pro "${item.name}"`, "error");
          return;
        }
        if (item.memberIds.length === 0) {
          showToast(`Přiřaďte členy k položce "${item.name}"`, "error");
          return;
        }
      }
    }
```

- [ ] **Step 6: Update finalAmount calculation for items mode**

In the save try block, after the `finalAmount` calculation for manual mode (line 269-277), add:

```typescript
      if (splitMode === "items") {
        finalAmount = expenseItems.reduce((sum, item) => sum + item.price, 0);
      }
```

- [ ] **Step 7: Add helper function to compute shares from items**

Before `handleSave`, add this helper:

```typescript
  const computeSharesFromItems = (
    items: ExpenseItem[],
  ): Record<string, number> => {
    const shares: Record<string, number> = {};

    for (const item of items) {
      const perPerson = item.price / item.memberIds.length;
      for (const memberId of item.memberIds) {
        shares[memberId] = (shares[memberId] || 0) + perPerson;
      }
    }

    // Round to 2 decimal places
    for (const key of Object.keys(shares)) {
      shares[key] = Math.round(shares[key] * 100) / 100;
    }

    return shares;
  };
```

- [ ] **Step 8: Update expense_shares creation for items mode**

In the create branch (inside `handleSave`, after inserting `expenseData`), the existing code builds `expenseShares` from auto/manual mode. Wrap the existing `expenseShares` construction and insert in a condition, and add items mode:

Replace the expense shares creation block (the `const expenseShares = selectedMembers.map(...)` and the subsequent insert, approximately lines 379-414) with:

```typescript
        // Build and insert expense shares
        let expenseShares: Array<{
          expense_id: string;
          profile_id: string;
          owed_amount: number;
        }>;

        if (splitMode === "items") {
          const sharesMap = computeSharesFromItems(expenseItems);
          expenseShares = Object.entries(sharesMap).map(
            ([profileId, amount]) => ({
              expense_id: expenseData.id,
              profile_id: profileId,
              owed_amount: amount,
            }),
          );
        } else {
          expenseShares = selectedMembers.map((member, index) => {
            let shareAmount: number;

            if (splitMode === "auto") {
              if (index === selectedMembers.length - 1) {
                const baseShare =
                  Math.ceil((finalAmount / selectedMembers.length) * 100) / 100;
                const totalBeforeLast =
                  baseShare * (selectedMembers.length - 1);
                shareAmount = finalAmount - totalBeforeLast;
              } else {
                shareAmount =
                  Math.ceil((finalAmount / selectedMembers.length) * 100) / 100;
              }
            } else {
              shareAmount = parseFloat(manualAmounts[member.id] || "0");
            }

            return {
              expense_id: expenseData.id,
              profile_id: member.id,
              owed_amount: shareAmount,
            };
          });
        }

        const { error: sharesError } = await supabase
          .from("expense_shares")
          .insert(expenseShares);

        if (sharesError) {
          logger.error("Error inserting expense shares:", sharesError);
          showToast(
            "Nepodařilo se uložit rozdělení: " + sharesError.message,
            "error",
          );
          return;
        }

        // Save expense items if in items mode
        if (splitMode === "items") {
          const itemRows = expenseItems.map((item) => ({
            expense_id: expenseData.id,
            name: item.name,
            price: item.price,
            position: item.position,
          }));

          const { data: savedItems, error: itemsError } = await supabase
            .from("expense_items")
            .insert(itemRows)
            .select();

          if (itemsError) {
            logger.error("Error inserting expense items:", itemsError);
            showToast(
              "Výdaj uložen, ale nepodařilo se uložit položky",
              "error",
            );
          } else if (savedItems) {
            // Insert item members
            const memberRows = savedItems.flatMap((savedItem: any, idx: number) =>
              expenseItems[idx].memberIds.map((profileId) => ({
                item_id: savedItem.id,
                profile_id: profileId,
              })),
            );

            if (memberRows.length > 0) {
              const { error: membersError } = await supabase
                .from("expense_item_members")
                .insert(memberRows);

              if (membersError) {
                logger.error("Error inserting item members:", membersError);
              }
            }
          }
        }
```

Do the same for the edit branch — replace the edit shares block (lines 316-351) similarly, but also delete old expense_items before inserting new ones. After deleting old shares (line 301-313), add:

```typescript
        // Delete existing expense items (CASCADE deletes item_members too)
        if (splitMode === "items") {
          await supabase
            .from("expense_items")
            .delete()
            .eq("expense_id", expenseId);
        }
```

And apply the same items-mode shares computation for the edit branch's expenseShares construction (lines 316-338):

```typescript
        let expenseShares: Array<{
          expense_id: string;
          profile_id: string;
          owed_amount: number;
        }>;

        if (splitMode === "items") {
          const sharesMap = computeSharesFromItems(expenseItems);
          expenseShares = Object.entries(sharesMap).map(
            ([profileId, amount]) => ({
              expense_id: expenseId!,
              profile_id: profileId,
              owed_amount: amount,
            }),
          );
        } else {
          expenseShares = selectedMembers.map((member, index) => {
            let shareAmount: number;

            if (splitMode === "auto") {
              if (index === selectedMembers.length - 1) {
                const baseShare =
                  Math.ceil((finalAmount / selectedMembers.length) * 100) / 100;
                const totalBeforeLast =
                  baseShare * (selectedMembers.length - 1);
                shareAmount = finalAmount - totalBeforeLast;
              } else {
                shareAmount =
                  Math.ceil((finalAmount / selectedMembers.length) * 100) / 100;
              }
            } else {
              shareAmount = parseFloat(manualAmounts[member.id] || "0");
            }

            return {
              expense_id: expenseId!,
              profile_id: member.id,
              owed_amount: shareAmount,
            };
          });
        }

        const { error: sharesError } = await supabase
          .from("expense_shares")
          .insert(expenseShares);

        if (sharesError) {
          logger.error("Error inserting expense shares:", sharesError);
          showToast(
            "Nepodařilo se uložit rozdělení: " + sharesError.message,
            "error",
          );
          return;
        }

        // Save expense items if in items mode
        if (splitMode === "items") {
          const itemRows = expenseItems.map((item) => ({
            expense_id: expenseId!,
            name: item.name,
            price: item.price,
            position: item.position,
          }));

          const { data: savedItems, error: itemsError } = await supabase
            .from("expense_items")
            .insert(itemRows)
            .select();

          if (itemsError) {
            logger.error("Error inserting expense items:", itemsError);
          } else if (savedItems) {
            const memberRows = savedItems.flatMap((savedItem: any, idx: number) =>
              expenseItems[idx].memberIds.map((profileId) => ({
                item_id: savedItem.id,
                profile_id: profileId,
              })),
            );

            if (memberRows.length > 0) {
              await supabase
                .from("expense_item_members")
                .insert(memberRows);
            }
          }
        }
```

- [ ] **Step 9: Update ExpenseSplitSection props in JSX**

Replace the `<ExpenseSplitSection>` usage (lines 609-621):

```tsx
          <ExpenseSplitSection
            flatMembers={flatMembers}
            selectedMembers={selectedMembers}
            onSelectedMembersChange={setSelectedMembers}
            splitMode={splitMode}
            onSplitModeChange={setSplitMode}
            amount={amount}
            onAmountChange={setAmount}
            manualAmounts={manualAmounts}
            onManualAmountsChange={setManualAmounts}
            touchedMembers={touchedMembers}
            onTouchedMembersChange={setTouchedMembers}
            expenseItems={expenseItems}
            onExpenseItemsChange={setExpenseItems}
          />
```

- [ ] **Step 10: Add receipt upload button and BottomSheet to JSX**

Before the `{/* Title Input */}` comment (line 504), add the receipt upload button:

```tsx
      {/* Receipt Upload */}
      <Card className="mb-4 mx-4">
        <CardContent>
          <Pressable
            onPress={() => setShowReceiptSheet(true)}
            disabled={isParsingReceipt}
            className="flex-row items-center justify-center gap-2 py-3 border border-dashed border-primary rounded-lg"
          >
            {isParsingReceipt ? (
              <>
                <ActivityIndicator size="small" className="text-primary" />
                <Text className="text-primary font-medium">
                  Zpracovávám účtenku...
                </Text>
              </>
            ) : (
              <>
                <Ionicons
                  name="receipt-outline"
                  size={20}
                  className="text-primary"
                />
                <Text className="text-primary font-medium">
                  Nahrát účtenku
                </Text>
              </>
            )}
          </Pressable>
        </CardContent>
      </Card>
```

Before the closing `</KeyboardAwareScrollView>` (line 677), add the BottomSheet and receipt source options:

```tsx
      {/* Receipt Source BottomSheet */}
      <BottomSheet
        visible={showReceiptSheet}
        onClose={() => setShowReceiptSheet(false)}
        title="Nahrát účtenku"
      >
        <View className="px-4 gap-3 pb-4">
          <Pressable
            onPress={handleTakePhoto}
            className="flex-row items-center gap-4 py-4 px-4 bg-secondary rounded-lg"
          >
            <Ionicons
              name="camera-outline"
              size={24}
              className="text-foreground"
            />
            <Text className="text-base text-foreground font-medium">
              Vyfotit
            </Text>
          </Pressable>
          <Pressable
            onPress={handlePickGallery}
            className="flex-row items-center gap-4 py-4 px-4 bg-secondary rounded-lg"
          >
            <Ionicons
              name="image-outline"
              size={24}
              className="text-foreground"
            />
            <Text className="text-base text-foreground font-medium">
              Vybrat z galerie
            </Text>
          </Pressable>
        </View>
      </BottomSheet>
```

- [ ] **Step 11: Commit**

```bash
git add components/expenses/ExpenseForm.tsx
git commit -m "feat: add receipt upload, items state, and items-mode save logic to ExpenseForm"
```

---

### Task 8: Update edit screen to load expense items

**Files:**
- Modify: `app/expenses/[id]/edit.tsx`

When editing an expense that has items, we need to load them and pass to ExpenseForm.

- [ ] **Step 1: Update initialData type**

In `app/expenses/[id]/edit.tsx`, update the `initialData` state type (lines 13-21):

```typescript
  const [initialData, setInitialData] = useState<{
    title: string;
    amount: string;
    date: Date;
    selectedPayer: Member[];
    selectedMembers: Member[];
    manualAmounts: Record<string, string>;
    splitMode: "auto" | "manual" | "items";
    expenseItems?: Array<{
      id: string;
      name: string;
      price: number;
      position: number;
      memberIds: string[];
    }>;
  } | null>(null);
```

- [ ] **Step 2: Add items loading after shares loading**

After the shares loading block (after line 76), add:

```typescript
      // Load expense items (if any)
      const { data: itemsData } = await supabase
        .from("expense_items")
        .select(`
          id,
          name,
          price,
          position,
          expense_item_members (
            profile_id
          )
        `)
        .eq("expense_id", id)
        .order("position");

      const hasItems = itemsData && itemsData.length > 0;
```

- [ ] **Step 3: Update splitMode detection and add items to initialData**

Replace the split mode detection and `setInitialData` call (lines 89-108):

```typescript
      // Determine split mode
      let detectedSplitMode: "auto" | "manual" | "items" = "auto";

      if (hasItems) {
        detectedSplitMode = "items";
      } else {
        const amounts = Object.values(manualAmounts).map((a) => parseFloat(a));
        const avgAmount =
          amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
        const isAutoSplit = amounts.every((a) => Math.abs(a - avgAmount) < 0.5);
        detectedSplitMode = isAutoSplit ? "auto" : "manual";
      }

      const loadedItems = hasItems
        ? itemsData!.map((item: any) => ({
            id: item.id,
            name: item.name,
            price: Number(item.price),
            position: item.position,
            memberIds: item.expense_item_members.map(
              (m: any) => m.profile_id,
            ),
          }))
        : [];

      setInitialData({
        title: expenseData.title,
        amount: expenseData.amount.toFixed(2),
        date: new Date(expenseData.happened_at),
        selectedPayer: [
          {
            ...expenseData.payer,
            surname: expenseData.payer.surname || "",
            role: "",
          },
        ],
        selectedMembers,
        manualAmounts,
        splitMode: detectedSplitMode,
        expenseItems: loadedItems,
      });
```

- [ ] **Step 4: Update ExpenseForm initialData interface**

In `components/expenses/ExpenseForm.tsx`, update `ExpenseFormProps.initialData` to include `expenseItems`:

```typescript
  initialData?: {
    title: string;
    amount: string;
    date: Date;
    selectedPayer: Member[];
    selectedMembers: Member[];
    manualAmounts: Record<string, string>;
    splitMode: "auto" | "manual" | "items";
    expenseItems?: ExpenseItem[];
  };
```

And update the `expenseItems` state initialization (in the state declarations):

```typescript
  const [expenseItems, setExpenseItems] = useState<ExpenseItem[]>(
    initialData?.expenseItems || [],
  );
```

- [ ] **Step 5: Commit**

```bash
git add app/expenses/[id]/edit.tsx components/expenses/ExpenseForm.tsx
git commit -m "feat: load and display expense items in edit mode"
```

---

### Task 9: Manual testing and fixes

- [ ] **Step 1: Start the dev server and test the full flow**

```bash
npm start
```

Test the following scenarios on device/emulator:

1. **Create expense with receipt:**
   - Open Finance → "+" → "Nahrát účtenku" → pick an image of a Czech receipt
   - Verify fields pre-fill (name, amount, date)
   - Verify items show with all members assigned
   - Change member assignments on some items
   - Save → verify expense appears in history with correct amount

2. **Create expense with manual items (no receipt):**
   - Open Finance → "+" → switch to "Položky" mode
   - Add items manually, set prices, assign members
   - Save → verify correct shares

3. **Create expense with auto/manual split (existing flow):**
   - Verify auto and manual split still work exactly as before

4. **Edit expense with items:**
   - Tap an expense created with items
   - Verify items load with correct member assignments
   - Modify an item, save
   - Verify changes persist

5. **Edge cases:**
   - Upload a non-receipt image → verify error message
   - Empty items list → verify validation
   - Item with no members → verify validation (should not happen since default is all)

- [ ] **Step 2: Fix any issues found**

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "fix: address issues found during receipt OCR testing"
```
