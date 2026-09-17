-- FCDGL Row Level Security policies
--
-- The site reads with the public anon key (server-side, lib/data.ts and the
-- /api routes) and the admin panel writes with the service_role key
-- (lib/supabase/admin.ts), which bypasses RLS. So every table needs exactly one
-- policy: anyone may read. No write policies are granted to anon.
--
-- Safe to re-run: policies are dropped and recreated.

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'players', 'weeks', 'attendance', 'doubles_events',
    'doubles_teams', 'aces', 'league_finances'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "Public read" ON %I', t);
    EXECUTE format(
      'CREATE POLICY "Public read" ON %I FOR SELECT TO anon, authenticated USING (true)',
      t
    );
  END LOOP;
END $$;
