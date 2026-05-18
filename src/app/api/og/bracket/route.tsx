import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams
  const username = p.get('u') ?? 'Someone'
  const champion = p.get('champion') ?? null
  const groups   = p.get('groups') ?? '0'   // number of groups submitted

  try {
    return new ImageResponse(
      (
        <div
          style={{
            background: '#09090b',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'sans-serif',
            position: 'relative',
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'white' }} />

          <div style={{ color: '#52525b', fontSize: 18, fontWeight: 900, letterSpacing: '-0.5px', marginBottom: 32 }}>
            predictr
          </div>

          <div style={{ color: '#71717a', fontSize: 20, marginBottom: 12 }}>
            {username}&apos;s WC 2026 bracket
          </div>

          {champion ? (
            <>
              <div style={{ color: '#71717a', fontSize: 18, marginBottom: 8 }}>
                Champion pick
              </div>
              <div style={{ color: '#ffffff', fontSize: 64, fontWeight: 900, lineHeight: 1, marginBottom: 40 }}>
                {champion}
              </div>
            </>
          ) : (
            <div style={{ color: '#ffffff', fontSize: 40, fontWeight: 900, marginBottom: 40 }}>
              {groups}/12 groups picked
            </div>
          )}

          <div style={{
            background: '#ffffff',
            color: '#000000',
            fontSize: 18,
            fontWeight: 900,
            padding: '12px 32px',
            borderRadius: 100,
          }}>
            Make your own picks
          </div>

          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: 'white' }} />
        </div>
      ),
      { width: 1200, height: 630 }
    )
  } catch (e) {
    return new Response(`OG image error: ${String(e)}`, { status: 500 })
  }
}
