---
name: Nook Component & Route Structure
description: Canonical domain locations for all components and app routes after the 2026-03-23 refactoring
type: project
---

Completed full architectural refactoring on 2026-03-23.

**Why:** Flat component/ root and flat app/ root violated domain separation. Plan was approved by user before execution.

**How to apply:** Any new component must go into the appropriate domain subfolder. Any new screen must use Expo Router nested paths, not flat names with query params.

## App Route Structure (under app/)

| New path | Old path |
|---|---|
| `chores/[id].tsx` | `chore-detail.tsx` |
| `chores/create.tsx` | `chore-create.tsx` |
| `chores/[id]/edit.tsx` | `chore-edit.tsx` |
| `chores/[id]/history.tsx` | `chore-history.tsx` |
| `expenses/create.tsx` | `expense-create.tsx` |
| `expenses/[id]/edit.tsx` | `expense-edit.tsx` |
| `issues/[id].tsx` | `issue-detail.tsx` |
| `issues/create.tsx` | (new pattern) |
| `issues/[id]/edit.tsx` | `issue-edit.tsx` |
| `documents/add.tsx` | `document-add.tsx` |
| `keys/create.tsx` | (new pattern) |
| `keys/[id]/edit.tsx` | `key-edit.tsx` |
| `flats/join.tsx` | (new nested) |
| `flats/create.tsx` | (new nested) |
| `settings/change-email.tsx` | `change-email.tsx` |
| `settings/reorder-widgets.tsx` | `reorder-widgets.tsx` |

Routes that stayed in app/ root: `profile.tsx`, `settings.tsx`

## Component Domain Structure

- `components/chores/` — ChoreForm, ChoreHistoryItem
- `components/expenses/` — ExpenseForm, ExpenseSplitSection, SettlementList
- `components/issues/` — IssueForm
- `components/flats/` — FlatsList, MemberList, MemberOrderList, CreateFlatForm, JoinFlatForm
- `components/keys/` — KeyForm, CodeModal
- `components/documents/` — DocumentViewerModal
- `components/shared/` — BottomSheet, DatePickerInput, MemberSelector, MemberSelectorButton, MemberSelectorSheet, MembersBottomSheet, NavBar, TopBar, ThemeToggle, WidgetReorderItem, Account, EmailVerification, PasswordVerification
- `components/dashboard_widgets/` — widget components (unchanged location)
- `components/ui/` — primitive RN components (unchanged)
