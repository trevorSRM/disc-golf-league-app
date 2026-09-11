-- FCDGL Database Schema
-- Fulton County Disc Golf League

-- Players table
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  is_member BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Weeks table (solo rounds)
CREATE TABLE IF NOT EXISTS weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_number INT NOT NULL,
  date DATE NOT NULL,
  course_name TEXT,
  ctp_winner_id UUID REFERENCES players(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Attendance table (tracks who played each week and their scores)
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id UUID NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  score INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(week_id, player_id)
);

-- Doubles events table
CREATE TABLE IF NOT EXISTS doubles_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_date DATE NOT NULL,
  course_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Doubles teams table
CREATE TABLE IF NOT EXISTS doubles_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES doubles_events(id) ON DELETE CASCADE,
  player1_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  player2_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  team_handicap DECIMAL(5,2),
  score INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Aces table
CREATE TABLE IF NOT EXISTS aces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  week_id UUID REFERENCES weeks(id) ON DELETE SET NULL,
  event_id UUID REFERENCES doubles_events(id) ON DELETE SET NULL,
  payout DECIMAL(10,2) NOT NULL,
  hole_number INT,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- League finances table (single row to track running totals)
CREATE TABLE IF NOT EXISTS league_finances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ace_pool DECIMAL(10,2) DEFAULT 0,
  total_collected DECIMAL(10,2) DEFAULT 0,
  total_paid_out DECIMAL(10,2) DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Initialize finances with a single row if empty
INSERT INTO league_finances (ace_pool, total_collected, total_paid_out)
SELECT 0, 0, 0
WHERE NOT EXISTS (SELECT 1 FROM league_finances);
