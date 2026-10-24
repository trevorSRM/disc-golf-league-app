-- FCDGL Season Finale
--
-- A finale event is a normal week flagged is_finale. Entry is free, only
-- members with a handicap may play, and payouts come from lib/finale.ts.
-- Safe to re-run.

-- Mark a week as a season finale event (doubles or singles via is_doubles).
ALTER TABLE weeks ADD COLUMN IF NOT EXISTS is_finale BOOLEAN NOT NULL DEFAULT FALSE;

-- Playoff results for tied paid positions:
-- { "places": { "<player or team id>": <playoff finish> }, "lowRaw": { ... } }
ALTER TABLE weeks ADD COLUMN IF NOT EXISTS finale_tiebreaks JSONB;

-- One row per CTP prize won at a finale event. winner_player_ids are the players
-- who split that prize (a doubles team, or every player on a singles card).
CREATE TABLE IF NOT EXISTS finale_ctps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id UUID NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
  ctp_key TEXT NOT NULL,
  winner_player_ids UUID[] NOT NULL DEFAULT '{}',
  winner_label TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (week_id, ctp_key)
);

-- Same policy as every other table (see 003_rls_policies.sql): anyone may read.
ALTER TABLE finale_ctps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read" ON finale_ctps;
CREATE POLICY "Public read" ON finale_ctps FOR SELECT TO anon, authenticated USING (true);
