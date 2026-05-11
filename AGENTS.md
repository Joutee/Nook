# AGENTS.md

This file provides project guidance for Codex and other coding agents working in this repository.

## Project Overview

Nook is a React Native mobile app for shared housing management. It is a client-only app: backend behavior lives in Supabase, with no custom API server in this repository.

The project is also a bachelor's thesis project. For deeper architecture and domain context, read `MASTER_CONTEXT.md`.

## Commands

```bash
# Start development server
npm start

# Run on Android device/emulator
npm run android

# Run on iOS device/simulator
npm run ios

# Run web version
npm run web
```

There are no test or lint scripts configured in `package.json`. Use focused TypeScript or runtime verification where appropriate for the change.

## Stack

- React Native 0.81.5 + Expo 54 managed workflow
- Expo Router 6 file-based routing
- NativeWind 4 for Tailwind-style React Native styling
- TypeScript throughout
- Supabase for PostgreSQL, Auth, Storage, and RLS
- React Context for global app state; no Redux/Zustand/etc.

## Environment

Copy `.env.example` to `.env` and fill in:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=your-anon-public-api-key-here
```

The `EXPO_PUBLIC_` prefix exposes variables to client code. Authorization must be enforced through Supabase RLS policies.

## Architecture

Expo Router maps `app/` to routes:

| Directory | Purpose |
| --- | --- |
| `app/(auth)/` | Unauthenticated screens: login, register, password reset, email verification |
| `app/(setup)/` | Post-auth onboarding: join flat, create flat, select role |
| `app/(tabs)/` | Main authenticated bottom-tab app |

The auth guard lives in `app/_layout.tsx` inside `LayoutContent`. It evaluates session, flat membership, and role, then redirects to auth/setup/main routes as needed.

Main global state is React Context:

- `contexts/FlatContext.tsx`: selected flat, available flats, user role, persisted current flat, computed helpers such as `hasFlat`, `hasRole`, and `isLandlord`.
- `contexts/ToastContext.tsx`: animated toast notifications with auto-dismiss.

## Roles

Database role strings are Czech and must be preserved:

- `"najemce"`: tenant; sees Chores and Finance tabs.
- `"pronajimatel"`: landlord; sees Issues, Documents, and Keys tabs.

Role membership is stored in `flat_profile` and enforced through Supabase RLS. Dashboard widget availability is configured in `config/widgetConfig.ts`.

## Supabase

All data access goes through `@supabase/supabase-js` in `lib/supabase.ts`. Use the Supabase query builder pattern, for example `.from("table").select().eq(...)`.

Key tables:

- `profiles`
- `flats`
- `flat_profile`
- `expenses`, `expense_shares`
- `chores`, `chore_profile`, `chore_completions`
- `issues`
- `documents`
- `keys`

Views:

- `view_chore_dashboard`
- `view_chore_history`
- `view_flat_balances`

Storage buckets:

- `documents`
- `issue-images`

Migrations live in `supabase/migrations/`. Use Supabase CLI for local application when needed.

## Routing Conventions

Use nested Expo Router paths for new detail/create/edit screens. Do not add new flat root route files when a domain path exists.

Canonical route patterns:

- `app/chores/[id].tsx`
- `app/chores/create.tsx`
- `app/chores/[id]/edit.tsx`
- `app/chores/[id]/history.tsx`
- `app/expenses/create.tsx`
- `app/expenses/[id]/edit.tsx`
- `app/issues/[id].tsx`
- `app/issues/create.tsx`
- `app/issues/[id]/edit.tsx`
- `app/documents/add.tsx`
- `app/keys/create.tsx`
- `app/keys/[id]/edit.tsx`
- `app/flats/join.tsx`
- `app/flats/create.tsx`
- `app/settings/change-email.tsx`
- `app/settings/reorder-widgets.tsx`

Routes intentionally remaining at `app/` root:

- `app/profile.tsx`
- `app/settings.tsx`

## Component Organization

Place new components in the existing domain folder:

- `components/chores/`: chore forms and chore history UI
- `components/expenses/`: expense forms, split UI, settlement UI
- `components/issues/`: issue forms and issue-specific UI
- `components/flats/`: flat, member, create/join flat UI
- `components/keys/`: key forms and key-specific UI
- `components/documents/`: document viewer and document-specific UI
- `components/shared/`: cross-domain reusable app components
- `components/dashboard_widgets/`: dashboard widget components
- `components/ui/`: primitive UI components only

## Imports

Use the `@/` path alias for project imports everywhere.

Relative imports (`../` or `./`) are not allowed outside `components/ui/`. The only exception is sibling/internal imports inside `components/ui/`.

Examples:

```ts
import { supabase } from "@/lib/supabase";
import { BottomSheet } from "@/components/shared/BottomSheet";
```

## Styling

Use NativeWind utility classes and existing semantic tokens from `tailwind.config.js` and `global.css`. The primary accent is purple (`hsl(270 89.1% 49%)`). Dark mode is class-based.

Primitive UI components such as Button, Card, Input, and Text live in `components/ui/` and use `@rn-primitives` where applicable.

## Important Utilities

| File | Purpose |
| --- | --- |
| `lib/choreUtils.ts` | Chore completion logic and validation |
| `lib/financeUtils.ts` | Currency formatting for Czech koruna locale |
| `lib/fileService.ts` | Image/document upload with compression |
| `lib/biometricAuth.ts` | Fingerprint/face auth and secure credential storage |
| `lib/theme.ts` | Theme token definitions |

## Working Rules

- Keep changes scoped to the requested feature or fix.
- Do not overwrite unrelated user changes in the working tree.
- Prefer established local patterns over new abstractions.
- Keep TypeScript types explicit where the existing code does.
- For database-sensitive changes, inspect migrations and RLS policies before editing client assumptions.
- When behavior depends on current auth, flat, or role state, check `FlatContext` and `app/_layout.tsx` before changing route flow.
