'use client'

import { useEffect, useState } from 'react'

const WC_KICKOFF = new Date('2026-06-11T00:00:00Z')

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function getTimeLeft() {
  const diff = Math.max(0, WC_KICKOFF.getTime() - Date.now())
  const total = Math.floor(diff / 1000)
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
    started: diff <= 0,
  }
}

export function WorldCupBanner() {
  const [time, setTime] = useState(getTimeLeft)

  useEffect(() => {
    const id = setInterval(() => setTime(getTimeLeft()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-border bg-surface-1">
      {/* Header */}
      <div className="relative flex items-center gap-3 bg-[#0a1628] px-4 py-3">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#003f8a]/50 via-transparent to-[#8b0000]/40" />

        {/* Official emblem */}
        <div className="relative z-10 flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/2026_FIFA_World_Cup_emblem.svg/250px-2026_FIFA_World_Cup_emblem.svg.png"
            alt="FIFA World Cup 2026 emblem"
            width={44}
            height={68}
            className="object-contain drop-shadow-lg"
          />
        </div>

        {/* Text */}
        <div className="relative z-10 min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-fg-3">FIFA</p>
          <p className="text-base font-black leading-tight tracking-tight text-fg-1">
            World Cup 2026™
          </p>
          <div className="mt-0.5 flex items-center gap-1">
            <span title="United States">🇺🇸</span>
            <span title="Canada">🇨🇦</span>
            <span title="Mexico">🇲🇽</span>
            <span className="ml-1.5 text-[11px] text-fg-3">11 Jun – 19 Jul</span>
          </div>
        </div>

        <span className="relative z-10 text-2xl">⚽</span>
      </div>

      {/* Countdown */}
      <div className="px-4 py-3">
        {time.started ? (
          <p className="text-center text-sm font-black text-gold">⚽ THE WORLD CUP IS LIVE!</p>
        ) : (
          <>
            <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-widest text-fg-3">
              Opening match kicks off in
            </p>
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { value: pad(time.days), label: 'Days' },
                { value: pad(time.hours), label: 'Hrs' },
                { value: pad(time.minutes), label: 'Min' },
                { value: pad(time.seconds), label: 'Sec' },
              ].map(({ value, label }) => (
                <div key={label} className="rounded-xl bg-surface-2 px-2 py-2.5">
                  <div className="font-mono text-xl font-black leading-none tabular-nums text-gold">
                    {value}
                  </div>
                  <div className="mt-1 text-[10px] text-fg-3">{label}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
