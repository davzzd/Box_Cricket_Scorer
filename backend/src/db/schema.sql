-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- DROP TABLES IF EXIST (Cascade to remove dependencies)
DROP TABLE IF EXISTS balls CASCADE;
DROP TABLE IF EXISTS overs CASCADE;
DROP TABLE IF EXISTS match_players CASCADE;
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS players CASCADE;
DROP TABLE IF EXISTS seasons CASCADE;

-- Seasons Table
CREATE TABLE seasons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ensure only one active season trigger/rule
CREATE OR REPLACE FUNCTION ensure_single_active_season()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
    UPDATE seasons SET is_active = false WHERE id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_single_active_season ON seasons;
CREATE TRIGGER trigger_single_active_season
BEFORE INSERT OR UPDATE ON seasons
FOR EACH ROW EXECUTE FUNCTION ensure_single_active_season();

-- Players Table
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Matches Table
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  season_id UUID REFERENCES seasons(id),
  overs INTEGER, -- General match settings
  overs_team1 INTEGER NOT NULL,
  overs_team2 INTEGER NOT NULL,
  toss_winner_team VARCHAR(10), -- 'A' or 'B'
  toss_decision VARCHAR(10), -- 'bat' or 'bowl'
  status VARCHAR(50) DEFAULT 'live', -- live, completed, cancelled
  current_striker_id UUID REFERENCES players(id),
  current_non_striker_id UUID REFERENCES players(id),
  current_bowler_id UUID REFERENCES players(id),
  result JSONB, -- Store detailed result object
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Match Players (junction table)
CREATE TABLE match_players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id),
  team VARCHAR(1) NOT NULL, -- 'A' or 'B'
  UNIQUE(match_id, player_id)
);

-- Balls Table (Event Store)
CREATE TABLE balls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  innings INTEGER NOT NULL, -- 1 or 2
  over_number INTEGER NOT NULL,
  ball_number INTEGER NOT NULL,
  striker_id UUID REFERENCES players(id),
  non_striker_id UUID REFERENCES players(id),
  bowler_id UUID REFERENCES players(id),
  wall_value INTEGER DEFAULT 0,
  runs_taken INTEGER DEFAULT 0,
  is_wide BOOLEAN DEFAULT false,
  is_no_ball BOOLEAN DEFAULT false,
  is_dismissal BOOLEAN DEFAULT false,
  dismissed_player_id UUID REFERENCES players(id),
  dismissal_type VARCHAR(50),
  fielder_id UUID REFERENCES players(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Overs Table (State Management)
CREATE TABLE overs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  innings INTEGER NOT NULL,
  over_number INTEGER NOT NULL,
  bowler_id UUID REFERENCES players(id),
  status VARCHAR(20) DEFAULT 'active', -- active, completed
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
