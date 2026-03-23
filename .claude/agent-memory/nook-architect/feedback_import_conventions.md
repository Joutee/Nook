---
name: Import and path conventions
description: Absolute import rules and patterns confirmed during the refactoring
type: feedback
---

Always use `@/` absolute paths for every import in this project. Relative imports (`../`, `./`) are never permitted in any file outside of `components/ui/` (which may use relative sibling imports internally).

**Why:** The user approved a plan that explicitly states "Always use absolute paths with the `@/` alias — never use relative paths."

**How to apply:** When writing or fixing any import, replace `../lib/supabase` → `@/lib/supabase`, `./BottomSheet` → `@/components/shared/BottomSheet`, etc. The only exception is `components/ui/` files importing sibling ui primitives.
