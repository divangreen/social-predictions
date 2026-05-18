// FIFA World Cup 2026 Groups — verify at fifa.com/en/tournaments/mens/worldcup/2026
// 48 teams, 12 groups (A–L), top 2 advance

export type WCGroup = {
  letter: string
  teams: [string, string, string, string]
}

export const WC2026_GROUPS: WCGroup[] = [
  { letter: 'A', teams: ['USA', 'Panama', 'El Salvador', 'Costa Rica'] },
  { letter: 'B', teams: ['Mexico', 'Ecuador', 'Jamaica', 'Venezuela'] },
  { letter: 'C', teams: ['Canada', 'Morocco', 'Croatia', 'Belgium'] },
  { letter: 'D', teams: ['Argentina', 'Chile', 'Peru', 'Australia'] },
  { letter: 'E', teams: ['Brazil', 'Paraguay', 'Colombia', 'Cameroon'] },
  { letter: 'F', teams: ['France', 'Uruguay', 'Iran', 'Senegal'] },
  { letter: 'G', teams: ['Spain', 'Turkey', 'Serbia', 'Japan'] },
  { letter: 'H', teams: ['England', 'Nigeria', 'Albania', 'Algeria'] },
  { letter: 'I', teams: ['Germany', 'Saudi Arabia', 'South Korea', 'Ukraine'] },
  { letter: 'J', teams: ['Portugal', 'Czech Republic', 'Tunisia', 'New Zealand'] },
  { letter: 'K', teams: ['Netherlands', 'Qatar', 'South Africa', 'Honduras'] },
  { letter: 'L', teams: ['Switzerland', 'Bosnia-Herzegovina', 'Poland', 'Ghana'] },
]

export const WC_TOURNAMENT_ID = '4429'
export const WC_LOCK_DATE = new Date('2026-06-11T12:00:00Z')
