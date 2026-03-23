# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

There are no test or lint scripts configured. The project uses Expo's built-in TypeScript checking.

## Architecture Overview

**Nook** is a React Native mobile app (iOS/Android) for shared housing management. It is a **client-only app** — all backend logic lives in Supabase; there is no custom API server.

**Stack:**
- **React Native 0.81.5** + **Expo 54** (managed workflow)
- **Expo Router 6** — file-based routing (like Next.js, but for React Native)
- **NativeWind 4** — Tailwind CSS utility classes in React Native
- **TypeScript** throughout
- **Supabase** — PostgreSQL + Auth + Storage + RLS

## Navigation / Routing

Expo Router maps the `app/` directory to routes:

| Directory | Route Group | Purpose |
|-----------|-------------|---------|
| `app/(auth)/` | Unauthenticated | login, register, forgot-password, reset-password, verify-email |
| `app/(setup)/` | Post-auth onboarding | join-flat, create-flat, select-role |
| `app/(tabs)/` | Main app | Bottom-tab navigation for authenticated users with a flat and role |

**Auth guard** lives in `app/_layout.tsx` (`LayoutContent` component). It checks session → flat → role and redirects accordingly.

## State Management

No external state library. Pure React Context:

- **`FlatContext`** (`contexts/FlatContext.tsx`) — Currently selected flat + user role. Persists to AsyncStorage. Provides `useFlatContext()` hook with computed values (`hasFlat`, `hasRole`, `isLandlord`).
- **`ToastContext`** (`contexts/ToastContext.tsx`) — Custom animated toast notifications with 3-second auto-dismiss. No external toast library.

## Role-Based Access

Two roles per flat (Czech terms used in DB):
- `"najemce"` — Tenant: sees Chores, Finance tabs
- `"pronajimatel"` — Landlord: sees Issues, Documents, Keys tabs

Role is stored in the `flat_profile` junction table and enforced via PostgreSQL RLS policies. The `widgetConfig.ts` also uses roles to control dashboard widget availability.

## Supabase / Database

All data access is via the `@supabase/supabase-js` client (`lib/supabase.ts`) — no ORM. Queries use the builder pattern: `.from("table").select().eq(...)`.

**Key tables:** `profiles`, `flats`, `flat_profile` (junction with role), `expenses`, `expense_shares`, `chores`, `chore_profile`, `chore_completions`, `issues`, `documents`, `keys`

**Views:** `view_chore_dashboard`, `view_chore_history`, `view_flat_balances`

**Storage buckets:** `documents` (PDFs), `issue-images` (photos)

Migrations are in `supabase/migrations/`. To apply locally, use the Supabase CLI.

## Environment Setup

Copy `.env.example` to `.env` and fill in:
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=your-anon-public-api-key-here
```

The `EXPO_PUBLIC_` prefix exposes variables to client code. RLS policies on the database enforce authorization.

## Path Aliases

`@/*` maps to the project root (configured in `tsconfig.json`). Use `@/lib/supabase`, `@/components/...`, etc.

## Styling

NativeWind (Tailwind in React Native). Custom color tokens are defined in `tailwind.config.js` and `global.css` using CSS custom properties in HSL format. Primary accent color is purple (`hsl(270 89.1% 49%)`). Dark mode uses class-based toggling.

Primitive UI components (Button, Card, Input, Text, etc.) are in `components/ui/` using `@rn-primitives` for accessibility.

## Dashboard Widget System

Widgets are registered in `config/widgetConfig.ts`. Each widget has a role filter, component, and metadata. Users can reorder widgets (persisted to AsyncStorage). Eight widgets: MyChores, Repayment, Issues, Flats, Members, Documents, Leaderboard, Keys.

## Key Utilities

| File | Purpose |
|------|---------|
| `lib/choreUtils.ts` | Chore completion logic and validation |
| `lib/financeUtils.ts` | Currency formatting (Czech Kč locale) |
| `lib/fileService.ts` | Image/document upload with compression (1080px max, 60% JPEG) |
| `lib/biometricAuth.ts` | Fingerprint/face auth with multi-account credential storage via `expo-secure-store` |
| `lib/theme.ts` | Theme token definitions for light/dark mode |

## Project Context

This is a bachelor's thesis project. The `MASTER_CONTEXT.md` file contains an extensive knowledge base about the project's architecture, business logic, and design decisions — useful for deep context.
