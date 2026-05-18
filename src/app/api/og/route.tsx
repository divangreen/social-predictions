import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams
  const home     = p.get('home')    ?? 'Home'
  const away     = p.get('away')    ?? 'Away'
  const hs       = p.get('hs')      ?? '?'
  const as_      = p.get('as')      ?? '?'
  const username = p.get('u')       ?? 'Someone'
  const pts      = p.get('pts')     ?? '0'
  const perfect  = p.get('p')       === '1'

  const resultLabel = perfect ? 'Perfect score!' : Number(pts) > 0 ? `+${pts} pts` : 'Missed'
  const resultColor = perfect ? '#4ade80' : Number(pts) > 0 ? '#4ade80' : '#52525b'

  try { return new ImageResponse(
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
        {/* Top accent line */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'white' }} />

        {/* predictr branding */}
        <div style={{ color: '#ffffff', fontSize: 20, fontWeight: 900, letterSpacing: '-0.5px', marginBottom: 40, opacity: 0.5 }}>
          predictr
        </div>

        {/* Teams */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 16 }}>
          <span style={{ color: '#ffffff', fontSize: 28, fontWeight: 700 }}>{home}</span>
          <span style={{ color: '#52525b', fontSize: 20 }}>vs</span>
          <span style={{ color: '#ffffff', fontSize: 28, fontWeight: 700 }}>{away}</span>
        </div>

        {/* Big score */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32 }}>
          <span style={{ color: '#ffffff', fontSize: 96, fontWeight: 900, lineHeight: 1 }}>{hs}</span>
          <span style={{ color: '#3f3f46', fontSize: 64, fontWeight: 900 }}>–</span>
          <span style={{ color: '#ffffff', fontSize: 96, fontWeight: 900, lineHeight: 1 }}>{as_}</span>
        </div>

        {/* Result */}
        <div style={{ color: resultColor, fontSize: 22, fontWeight: 700, marginBottom: 40 }}>
          {resultLabel}
        </div>

        {/* Username */}
        <div style={{ color: '#52525b', fontSize: 16 }}>
          {username} on predictr
        </div>

        {/* Bottom accent */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: 'white' }} />
      </div>
    ),
    { width: 1200, height: 630 }
  )} catch (e) {
    return new Response(`OG image error: ${String(e)}`, { status: 500 })
  }
}
