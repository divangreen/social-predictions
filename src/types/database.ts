export type TournamentStatus = 'upcoming' | 'active' | 'completed'
export type FixtureStatus = 'scheduled' | 'live' | 'completed'
export type PredictionStatus = 'pending' | 'scored' | 'void'

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
  predicted_home_score: number
  predicted_away_score: number
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

// Joined types for common queries
export interface PredictionWithFixture extends Prediction {
  fixture: Fixture
}

export interface LeagueWithMembers extends League {
  league_members: (LeagueMember & { user: User })[]
}

export interface Database {
  public: {
    Tables: {
      tournaments: {
        Row: Tournament
        Insert: Omit<Tournament, 'status'> & { status?: TournamentStatus | null }
        Update: Partial<Tournament>
        Relationships: []
      }
      fixtures: {
        Row: Fixture
        Insert: Omit<Fixture, 'id' | 'is_underdog_home' | 'is_underdog_away' | 'status' | 'home_score' | 'away_score'> & {
          id?: string
          is_underdog_home?: boolean | null
          is_underdog_away?: boolean | null
          status?: FixtureStatus | null
          home_score?: number | null
          away_score?: number | null
        }
        Update: Partial<Fixture>
        Relationships: []
      }
      predictions: {
        Row: Prediction
        Insert: Omit<Prediction, 'id' | 'status' | 'points_earned' | 'is_perfect' | 'created_at'> & {
          id?: string
          status?: PredictionStatus | null
          points_earned?: number | null
          is_perfect?: boolean | null
          created_at?: string
        }
        Update: Partial<Prediction>
        Relationships: []
      }
      leagues: {
        Row: League
        Insert: Omit<League, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<League>
        Relationships: []
      }
      league_members: {
        Row: LeagueMember
        Insert: Omit<LeagueMember, 'joined_at'> & { joined_at?: string }
        Update: Partial<LeagueMember>
        Relationships: []
      }
      users: {
        Row: User
        Insert: Omit<User, 'is_guest' | 'total_points' | 'accuracy_percentage' | 'created_at'> & {
          is_guest?: boolean | null
          total_points?: number | null
          accuracy_percentage?: number | null
          created_at?: string
        }
        Update: Partial<User>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
  }
}
