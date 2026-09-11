-- FCDGL Full Schema Restore
-- Fulton County Disc Golf League
--
-- This reflects the ACTUAL current schema the app depends on (reconstructed from
-- lib/types.ts), which is a superset of the original scripts/001_create_tables.sql.
-- Safe to run on a fresh database; every statement is idempotent.

-- Players
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  is_member BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Weeks (an "event" is a week)
CREATE TABLE IF NOT EXISTS weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_number INT NOT NULL,
  date DATE NOT NULL,
  course_name TEXT,
  ctp_winner_id UUID REFERENCES players(id) ON DELETE SET NULL,
  is_doubles BOOLEAN NOT NULL DEFAULT FALSE,
  is_submitted BOOLEAN NOT NULL DEFAULT FALSE,
  cards_saved BOOLEAN NOT NULL DEFAULT FALSE,
  card_assignments JSONB,
  doubles_scoring_type TEXT CHECK (doubles_scoring_type IN ('raw', 'handicap')),
  doubles_ctp_team_id UUID,
  playoff_winner_id UUID REFERENCES players(id) ON DELETE SET NULL,
  playoff_winner_team_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Backfill columns if an older/partial weeks table already exists
ALTER TABLE weeks ADD COLUMN IF NOT EXISTS is_doubles BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE weeks ADD COLUMN IF NOT EXISTS is_submitted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE weeks ADD COLUMN IF NOT EXISTS cards_saved BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE weeks ADD COLUMN IF NOT EXISTS card_assignments JSONB;
ALTER TABLE weeks ADD COLUMN IF NOT EXISTS doubles_scoring_type TEXT;
ALTER TABLE weeks ADD COLUMN IF NOT EXISTS doubles_ctp_team_id UUID;
ALTER TABLE weeks ADD COLUMN IF NOT EXISTS playoff_winner_id UUID;
ALTER TABLE weeks ADD COLUMN IF NOT EXISTS playoff_winner_team_id UUID;

-- Attendance (who played each week + their score)
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id UUID NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  score INT,
  sanctioned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(week_id, player_id)
);
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS sanctioned BOOLEAN NOT NULL DEFAULT FALSE;

-- Doubles events (standalone doubles nights)
CREATE TABLE IF NOT EXISTS doubles_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_date DATE NOT NULL,
  course_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Doubles teams (can belong to a doubles_event OR a doubles week)
CREATE TABLE IF NOT EXISTS doubles_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES doubles_events(id) ON DELETE CASCADE,
  week_id UUID REFERENCES weeks(id) ON DELETE CASCADE,
  player1_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  player2_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  team_handicap DECIMAL(5,2),
  score INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE doubles_teams ADD COLUMN IF NOT EXISTS week_id UUID REFERENCES weeks(id) ON DELETE CASCADE;

-- Aces
CREATE TABLE IF NOT EXISTS aces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  week_id UUID REFERENCES weeks(id) ON DELETE SET NULL,
  event_id UUID REFERENCES doubles_events(id) ON DELETE SET NULL,
  payout DECIMAL(10,2) NOT NULL,
  hole_number INT,
  course_name TEXT,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE aces ADD COLUMN IF NOT EXISTS course_name TEXT;

-- League finances (single running-totals row)
CREATE TABLE IF NOT EXISTS league_finances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ace_pool DECIMAL(10,2) DEFAULT 0,
  total_collected DECIMAL(10,2) DEFAULT 0,
  total_paid_out DECIMAL(10,2) DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO league_finances (ace_pool, total_collected, total_paid_out)
SELECT 0, 0, 0
WHERE NOT EXISTS (SELECT 1 FROM league_finances);
