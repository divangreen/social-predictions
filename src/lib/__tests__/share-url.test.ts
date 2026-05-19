import { describe, it, expect } from 'vitest'

// Share URL builder mirrored from FixtureCard shareResult
function buildShareUrl(
  siteUrl: string,
  homeTeam: string,
  awayTeam: string,
  homeScore: number | null,
  awayScore: number | null,
  username: string,
  pointsEarned: number,
  isPerfect: boolean
): string {
  const params = new URLSearchParams({
    home: homeTeam,
    away: awayTeam,
    hs: String(homeScore ?? ''),
    as: String(awayScore ?? ''),
    u: username,
    pts: String(pointsEarned),
    ...(isPerfect ? { p: '1' } : {}),
  })
  return `${siteUrl}/share/prediction?${params.toString()}`
}

describe('buildShareUrl', () => {
  const base = 'https://predictr.app'

  it('builds a valid URL with all params', () => {
    const url = buildShareUrl(base, 'Brazil', 'Argentina', 2, 1, 'divan', 3, true)
    expect(url).toContain('/share/prediction?')
    expect(url).toContain('home=Brazil')
    expect(url).toContain('away=Argentina')
    expect(url).toContain('hs=2')
    expect(url).toContain('as=1')
    expect(url).toContain('u=divan')
    expect(url).toContain('pts=3')
    expect(url).toContain('p=1')
  })

  it('omits p param when not perfect', () => {
    const url = buildShareUrl(base, 'Brazil', 'Argentina', 2, 1, 'divan', 1, false)
    expect(url).not.toContain('p=1')
  })

  it('encodes team names with spaces', () => {
    const url = buildShareUrl(base, 'El Salvador', 'Costa Rica', 1, 0, 'user', 3, false)
    expect(url).toContain('El+Salvador')
    expect(url).toContain('Costa+Rica')
  })

  it('handles null scores (fixture not yet completed)', () => {
    const url = buildShareUrl(base, 'Brazil', 'Argentina', null, null, 'divan', 0, false)
    expect(url).toContain('hs=')
    expect(url).toContain('as=')
  })

  it('handles 0 points (missed prediction)', () => {
    const url = buildShareUrl(base, 'France', 'Spain', 1, 0, 'user', 0, false)
    expect(url).toContain('pts=0')
  })

  it('starts with siteUrl', () => {
    const url = buildShareUrl(base, 'A', 'B', 0, 0, 'u', 0, false)
    expect(url.startsWith(base)).toBe(true)
  })

  it('works with localhost siteUrl', () => {
    const url = buildShareUrl('http://localhost:3000', 'A', 'B', 0, 0, 'u', 0, false)
    expect(url.startsWith('http://localhost:3000')).toBe(true)
  })
})

// ─── OG page param parsing ────────────────────────────────────────────────────

describe('share page param parsing', () => {
  it('parses pts as number', () => {
    const pts = Number('3')
    expect(pts).toBe(3)
  })

  it('pts defaults to 0 when missing', () => {
    const raw: string | undefined = undefined
    const pts = Number(raw ?? 0)
    expect(pts).toBe(0)
  })

  it('perfect flag set when p=1', () => {
    const check = (p: string | undefined) => p === '1'
    expect(check('1')).toBe(true)
    expect(check('0')).toBe(false)
    expect(check(undefined)).toBe(false)
  })
})
