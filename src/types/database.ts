export type TournamentStatus = 'upcoming' | 'active' | 'completed'
export type FixtureStatus = 'scheduled' | 'live' | 'completed'
export type PredictionStatus = 'pending' | 'scored' | 'void'

// Application-level interfaces (used throughout the app)
export interface Tournament {
  id: string
  name: string
  sport: string
  status: TournamentStatus | null
}

export interface Fixture {
  id: string
  tournament_id: string
  home_team_name: string
  home_team_logo: string | null
  away_team_name: string
  away_team_logo: string | null
  is_underdog_home: boolean | null
  is_underdog_away: boolean | null
  kickoff_time: string
  status: FixtureStatus | null
  home_score: number | null
  away_score: number | null
  stage: string
}

export interface Prediction {
  id: string
  user_id: string
  fixture_id: string
  prediction_type: 'score' | 'result'
  predicted_home_score: number | null
  predicted_away_score: number | null
  predicted_result: 'home' | 'draw' | 'away' | null
  status: PredictionStatus | null
  points_earned: number | null
  is_perfect: boolean | null
  created_at: string
}

export interface League {
  id: string
  name: string
  invite_code: string
  created_by: string | null
  tournament_id: string
  created_at: string
}

export interface LeagueMember {
  league_id: string
  user_id: string
  joined_at: string
}

export interface User {
  id: string
  username: string
  avatar_url: string | null
  favorite_team_id: string | null
  is_guest: boolean | null
  total_points: number | null
  accuracy_percentage: number | null
  created_at: string
}

export interface PredictionWithFixture extends Prediction {
  fixture: Fixture
}

export interface LeagueWithMembers extends League {
  league_members: (LeagueMember & { user: User })[]
}

// Supabase Database type — inline format matching Supabase CLI output.
// Complex Omit<>&{} intersections fail the GenericSchema extends check;
// explicit inline types are guaranteed to satisfy Record<string, unknown>.
export type Database = {
  public: {
    Tables: {
      tournaments: {
        Row: {
          id: string
          name: string
          sport: string
          status: 'upcoming' | 'active' | 'completed' | null
        }
        Insert: {
          id?: string
          name: string
          sport: string
          status?: string | null
        }
        Update: {
          id?: string
          name?: string
          sport?: string
          status?: string | null
        }
        Relationships: []
      }
      fixtures: {
        Row: {
          id: string
          tournament_id: string
          home_team_name: string
          home_team_logo: string | null
          away_team_name: string
          away_team_logo: string | null
          is_underdog_home: boolean | null
          is_underdog_away: boolean | null
          kickoff_time: string
          status: 'scheduled' | 'live' | 'completed' | null
          home_score: number | null
          away_score: number | null
          stage: string
          ai_banter: string | null
        }
        Insert: {
          id?: string
          tournament_id: string
          home_team_name: string
          home_team_logo?: string | null
          away_team_name: string
          away_team_logo?: string | null
          is_underdog_home?: boolean | null
          is_underdog_away?: boolean | null
          kickoff_time: string
          status?: string | null
          home_score?: number | null
          away_score?: number | null
          stage: string
          ai_banter?: string | null
        }
        Update: {
          id?: string
          tournament_id?: string
          home_team_name?: string
          home_team_logo?: string | null
          away_team_name?: string
          away_team_logo?: string | null
          is_underdog_home?: boolean | null
          is_underdog_away?: boolean | null
          kickoff_time?: string
          status?: string | null
          home_score?: number | null
          away_score?: number | null
          stage?: string
          ai_banter?: string | null
        }
        Relationships: []
      }
      predictions: {
        Row: {
          id: string
          user_id: string
          fixture_id: string
          prediction_type: 'score' | 'result'
          predicted_home_score: number | null
          predicted_away_score: number | null
          predicted_result: 'home' | 'draw' | 'away' | null
          status: 'pending' | 'scored' | 'void' | null
          points_earned: number | null
          is_perfect: boolean | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          fixture_id: string
          prediction_type?: string
          predicted_home_score?: number | null
          predicted_away_score?: number | null
          predicted_result?: string | null
          status?: string | null
          points_earned?: number | null
          is_perfect?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          fixture_id?: string
          prediction_type?: string
          predicted_home_score?: number | null
          predicted_away_score?: number | null
          predicted_result?: string | null
          status?: string | null
          points_earned?: number | null
          is_perfect?: boolean | null
          created_at?: string
        }
        Relationships: []
      }
      leagues: {
        Row: {
          id: string
          name: string
          invite_code: string
          created_by: string | null
          tournament_id: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          invite_code: string
          created_by?: string | null
          tournament_id: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          invite_code?: string
          created_by?: string | null
          tournament_id?: string
          created_at?: string
        }
        Relationships: []
      }
      league_members: {
        Row: {
          league_id: string
          user_id: string
          joined_at: string
        }
        Insert: {
          league_id: string
          user_id: string
          joined_at?: string
        }
        Update: {
          league_id?: string
          user_id?: string
          joined_at?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          id: string
          username: string
          avatar_url: string | null
          favorite_team_id: string | null
          is_guest: boolean | null
          total_points: number | null
          accuracy_percentage: number | null
          created_at: string
        }
        Insert: {
          id: string
          username: string
          avatar_url?: string | null
          favorite_team_id?: string | null
          is_guest?: boolean | null
          total_points?: number | null
          accuracy_percentage?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          username?: string
          avatar_url?: string | null
          favorite_team_id?: string | null
          is_guest?: boolean | null
          total_points?: number | null
          accuracy_percentage?: number | null
          created_at?: string
        }
        Relationships: []
      }
      reactions: {
        Row: {
          id: string
          prediction_id: string
          user_id: string
          emoji: string
          created_at: string
        }
        Insert: {
          id?: string
          prediction_id: string
          user_id: string
          emoji: string
          created_at?: string
        }
        Update: {
          id?: string
          prediction_id?: string
          user_id?: string
          emoji?: string
          created_at?: string
        }
        Relationships: []
      }
      knockout_picks: {
        Row: {
          id: string
          user_id: string
          tournament_id: string
          picks: Record<string, unknown>
          points_earned: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tournament_id: string
          picks: Record<string, unknown>
          points_earned?: number | null
          created_at?: string
        }
        Update: {
          picks?: Record<string, unknown>
          points_earned?: number | null
        }
        Relationships: []
      }
      bracket_predictions: {
        Row: {
          id: string
          user_id: string
          tournament_id: string
          group_letter: string
          first_place: string
          second_place: string
          points_earned: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tournament_id: string
          group_letter: string
          first_place: string
          second_place: string
          points_earned?: number | null
          created_at?: string
        }
        Update: {
          points_earned?: number | null
          first_place?: string
          second_place?: string
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      increment_user_points: {
        Args: { p_user_id: string; p_delta: number }
        Returns: void
      }
    }
  }
}
