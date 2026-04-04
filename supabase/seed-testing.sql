-- ============================================================================
-- SEED SCRIPT PRO UŽIVATELSKÉ TESTOVÁNÍ APLIKACE NOOK
-- ============================================================================
--
-- PŘEDPOKLADY:
--   4 uživatelé musí být vytvořeni ručně přes Supabase Dashboard (auth.users).
--   Jejich UUID jsou hardcodované níže. Profily (profiles) vytváří trigger
--   handle_new_user automaticky — tento script je nemodifikuje.
--
-- SPUŠTĚNÍ:
--   Přes Supabase SQL Editor nebo: psql -f supabase/seed-testing.sql
--
-- Script je idempotentní — při opakovaném spuštění smaže a znovu vytvoří data.
-- ============================================================================

BEGIN;

-- ============================================================================
-- KONSTANTY (UUID pro všechny entity)
-- ============================================================================

DO $$
DECLARE
  -- Uživatelé (vytvořeni ručně přes Supabase Dashboard)
  v_respondent_id uuid := 'd5c7f1b7-f106-4dc5-8852-b265a9ea2bbb';
  v_adam_id       uuid := '4351ffe6-757f-4b57-9a40-d894a673e802';
  v_bara_id       uuid := 'd8bcf989-4798-48dd-8778-25020fd98912';
  v_karel_id      uuid := '4e872629-5568-4cb2-a5cb-617697c92c04'; -- pronajímatel

  -- Byt
  v_flat_id uuid := 'f0000000-0000-0000-0000-000000000001';

  -- Výdaje
  v_expense1_id uuid := 'e0000000-0000-0000-0000-000000000001';
  v_expense2_id uuid := 'e0000000-0000-0000-0000-000000000002';
  v_expense3_id uuid := 'e0000000-0000-0000-0000-000000000003';

  -- Úkoly
  v_chore1_id uuid := 'c0000000-0000-0000-0000-000000000001';
  v_chore2_id uuid := 'c0000000-0000-0000-0000-000000000002';

  -- Závada
  v_issue_id uuid := 'd0000000-0000-0000-0000-000000000001';

  -- Klíče
  v_key1_id uuid := 'b0000000-0000-0000-0000-000000000001';
  v_key2_id uuid := 'b0000000-0000-0000-0000-000000000002';

  -- Dokument
  v_doc_id uuid := '00000000-dddd-0000-0000-000000000001';

BEGIN

  -- ==========================================================================
  -- 1. PROFILES (auth.users vytvořeni ručně přes Dashboard)
  -- ==========================================================================
  -- Trigger handle_new_user normálně vytváří profily, ale při sedu vkládáme přímo.
  -- Profily už existují (vytvořeny triggerem handle_new_user při registraci).
  -- Neměníme jméno/příjmení — necháváme jak je uživatel vytvořil.

  -- ==========================================================================
  -- 3. FLAT (byt)
  -- ==========================================================================
  INSERT INTO public.flats (id, name, address, code, created_at)
  VALUES (v_flat_id, 'Testovací byt', 'Vinohradská 42, Praha 2', 'NOOK-TEST-42', now())
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    code = EXCLUDED.code;

  -- ==========================================================================
  -- 4. FLAT_PROFILE (členství)
  -- ==========================================================================
  -- Smazat staré záznamy pro tyto uživatele v tomto bytě, aby nedocházelo k duplicitám
  -- (flat_profile nemá vhodný unique constraint pro ON CONFLICT).
  -- Také vypneme trigger auto_set_admin aby nám nenastavoval is_admin automaticky.
  ALTER TABLE public.flat_profile DISABLE TRIGGER auto_set_admin;

  DELETE FROM public.flat_profile
  WHERE flat_id = v_flat_id
    AND profile_id IN (v_respondent_id, v_adam_id, v_bara_id, v_karel_id);

  INSERT INTO public.flat_profile (flat_id, profile_id, role, active, is_admin, joined_at, dashboard_layout)
  VALUES
    (v_flat_id, v_karel_id,      'pronajimatel', true, true,  now() - interval '30 days', null),
    (v_flat_id, v_respondent_id, 'najemce',      true, false, now() - interval '30 days', null),
    (v_flat_id, v_adam_id,       'najemce',      true, false, now() - interval '28 days', null),
    (v_flat_id, v_bara_id,       'najemce',      true, false, now() - interval '26 days', null);

  ALTER TABLE public.flat_profile ENABLE TRIGGER auto_set_admin;

  -- ==========================================================================
  -- 5. EXPENSES (výdaje)
  -- ==========================================================================
  -- Smazat staré výdaje (CASCADE smaže i expense_shares)
  DELETE FROM public.expenses WHERE id IN (v_expense1_id, v_expense2_id, v_expense3_id);

  -- a) Nákup potravin — 420 Kč, zaplatil Adam, před 3 týdny
  INSERT INTO public.expenses (id, flat_id, payer_id, title, amount, currency, is_settlement, happened_at, created_at)
  VALUES (v_expense1_id, v_flat_id, v_adam_id, 'Nákup potravin', 420.00, 'CZK', false,
          now() - interval '21 days', now() - interval '21 days');

  -- b) Internet — 600 Kč, zaplatila Bára, před 2 týdny
  INSERT INTO public.expenses (id, flat_id, payer_id, title, amount, currency, is_settlement, happened_at, created_at)
  VALUES (v_expense2_id, v_flat_id, v_bara_id, 'Internet', 600.00, 'CZK', false,
          now() - interval '14 days', now() - interval '14 days');

  -- c) Čistící prostředky — 180 Kč, zaplatil Respondent, před 1 týdnem
  INSERT INTO public.expenses (id, flat_id, payer_id, title, amount, currency, is_settlement, happened_at, created_at)
  VALUES (v_expense3_id, v_flat_id, v_respondent_id, 'Čistící prostředky', 180.00, 'CZK', false,
          now() - interval '7 days', now() - interval '7 days');

  -- ==========================================================================
  -- 6. EXPENSE_SHARES (rozdělení výdajů)
  -- ==========================================================================
  -- CASCADE z DELETE výše už smazalo staré shares, ale pro jistotu:
  DELETE FROM public.expense_shares WHERE expense_id IN (v_expense1_id, v_expense2_id, v_expense3_id);

  -- a) Nákup potravin: 420 / 3 = 140 Kč na osobu
  INSERT INTO public.expense_shares (expense_id, profile_id, owed_amount) VALUES
    (v_expense1_id, v_respondent_id, 140.00),
    (v_expense1_id, v_adam_id,       140.00),
    (v_expense1_id, v_bara_id,       140.00);

  -- b) Internet: 600 / 3 = 200 Kč na osobu
  INSERT INTO public.expense_shares (expense_id, profile_id, owed_amount) VALUES
    (v_expense2_id, v_respondent_id, 200.00),
    (v_expense2_id, v_adam_id,       200.00),
    (v_expense2_id, v_bara_id,       200.00);

  -- c) Čistící prostředky: 180 / 3 = 60 Kč na osobu
  INSERT INTO public.expense_shares (expense_id, profile_id, owed_amount) VALUES
    (v_expense3_id, v_respondent_id, 60.00),
    (v_expense3_id, v_adam_id,       60.00),
    (v_expense3_id, v_bara_id,       60.00);

  -- ==========================================================================
  -- 7. CHORES (úkoly na úklid)
  -- ==========================================================================
  -- Výpočet current_cycle_index v view_chore_dashboard:
  --   floor(extract(epoch from (now() - start_date)) / (86400 * interval_days))
  -- Assignee = assignee_ids[(current_cycle_index % total_assignees) + 1]  (1-indexed)
  --
  -- Pro 3 lidi a interval 7 dní:
  --   start_date = now() - 21 days → cycle = floor(21*86400 / 7*86400) = 3
  --   3 % 3 = 0 → pozice [0+1] = [1] = první v rotation_order
  --
  -- Vysávání: rotation Respondent(0), Adam(1), Bára(2) → Respondent je na řadě ✓
  -- Mytí:     rotation Adam(0), Bára(1), Respondent(2) → Adam je na řadě ✓

  DELETE FROM public.chores WHERE id IN (v_chore1_id, v_chore2_id);

  -- a) Vysávání obýváku
  INSERT INTO public.chores (id, flat_id, name, description, start_date, interval_days)
  VALUES (v_chore1_id, v_flat_id, 'Vysávání obýváku', 'Vysát celý obývací pokoj včetně koberců',
          now() - interval '21 days', 7);

  -- b) Mytí koupelny
  INSERT INTO public.chores (id, flat_id, name, description, start_date, interval_days)
  VALUES (v_chore2_id, v_flat_id, 'Mytí koupelny', 'Umýt vanu, umyvadlo, záchod a podlahu',
          now() - interval '21 days', 7);

  -- ==========================================================================
  -- 8. CHORE_PROFILE (rotace)
  -- ==========================================================================
  DELETE FROM public.chore_profile WHERE chore_id IN (v_chore1_id, v_chore2_id);

  -- Vysávání: Respondent → Adam → Bára
  INSERT INTO public.chore_profile (chore_id, profile_id, rotation_order) VALUES
    (v_chore1_id, v_respondent_id, 0),
    (v_chore1_id, v_adam_id,       1),
    (v_chore1_id, v_bara_id,       2);

  -- Mytí koupelny: Adam → Bára → Respondent
  INSERT INTO public.chore_profile (chore_id, profile_id, rotation_order) VALUES
    (v_chore2_id, v_adam_id,       0),
    (v_chore2_id, v_bara_id,       1),
    (v_chore2_id, v_respondent_id, 2);

  -- ==========================================================================
  -- 9. CHORE_COMPLETIONS (historie splnění)
  -- ==========================================================================
  -- Přidáme splnění pro předchozí cykly, aby byla historie.
  -- Aktuální cyklus (index 3) pro Vysávání NESMÍ mít completion (scénář S5).
  DELETE FROM public.chore_completions WHERE chore_id IN (v_chore1_id, v_chore2_id);

  -- Vysávání — cykly 0, 1, 2 splněny (aktuální cyklus 3 = NESPLNĚNÝ)
  INSERT INTO public.chore_completions (chore_id, profile_id, cycle_index, completed_at) VALUES
    (v_chore1_id, v_respondent_id, 0, now() - interval '21 days' + interval '1 day'),
    (v_chore1_id, v_adam_id,       1, now() - interval '14 days' + interval '2 days'),
    (v_chore1_id, v_bara_id,       2, now() - interval '7 days'  + interval '1 day');

  -- Mytí koupelny — cykly 0, 1, 2 splněny
  INSERT INTO public.chore_completions (chore_id, profile_id, cycle_index, completed_at) VALUES
    (v_chore2_id, v_adam_id,       0, now() - interval '20 days'),
    (v_chore2_id, v_bara_id,       1, now() - interval '13 days'),
    (v_chore2_id, v_respondent_id, 2, now() - interval '6 days');

  -- ==========================================================================
  -- 10. ISSUES (závady)
  -- ==========================================================================
  DELETE FROM public.issues WHERE id = v_issue_id;

  INSERT INTO public.issues (id, flat_id, profile_id, title, description, image_path, status, created_at, updated_at)
  VALUES (
    v_issue_id, v_flat_id, v_adam_id,
    'Nefunguje zásuvka v pokoji',
    'Zásuvka u okna v obývacím pokoji nefunguje, když do ní zapojím cokoliv, nic se nestane.',
    null,
    'in_progress',
    now() - interval '5 days',
    now() - interval '5 days'
  );

  -- ==========================================================================
  -- 11. KEYS (klíče)
  -- ==========================================================================
  DELETE FROM public.keys WHERE id IN (v_key1_id, v_key2_id);

  INSERT INTO public.keys (id, flat_id, name, description, created_by, assigned_to, created_at) VALUES
    (v_key1_id, v_flat_id, 'Hlavní vchod', 'Klíč od hlavního vchodu do domu',
     v_respondent_id, v_adam_id, now() - interval '30 days'),
    (v_key2_id, v_flat_id, 'Schránka', 'Klíč od poštovní schránky',
     v_respondent_id, v_bara_id, now() - interval '30 days');

  -- ==========================================================================
  -- 12. DOCUMENTS (dokumenty)
  -- ==========================================================================
  DELETE FROM public.documents WHERE id = v_doc_id;

  INSERT INTO public.documents (id, flat_id, name, description, document_path, created_at)
  VALUES (
    v_doc_id, v_flat_id,
    'Nájemní smlouva',
    'Smlouva o nájmu bytu platná od 1.1.2026',
    'documents/najemni-smlouva.pdf',
    now() - interval '30 days'
  );

END $$;

COMMIT;

-- ============================================================================
-- SOUHRN TESTOVACÍCH ÚČTŮ
-- ============================================================================
-- Email                     | Heslo       | Jméno             | Role
-- respondent@test.nook.cz   | Test1234!   | Test Respondent   | nájemce (admin)
-- adam@test.nook.cz          | Test1234!   | Adam Novák        | nájemce
-- bara@test.nook.cz          | Test1234!   | Bára Svobodová    | nájemce
-- ============================================================================
