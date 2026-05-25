'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'
import FixtureCard from './FixtureCard'
import type { Fixture, Prediction } from '@/types/database'

interface Props {
  initialFixtures: Fixture[]
  predictions: [string, Prediction][]
  tournamentId: string
  tournamentSport: string
  username: string
  siteUrl: string
}

function fixtureOrder(f: Pick<Fixture, 'status' | 'kickoff_time'>, now: Date): number {
  if (f.status === 'live') return 0
  if (new Date(f.kickoff_time) > now) return 1
  return 2
}

export function RealtimeFixtureList({ initialFixtures, predictions, tournamentId, tournamentSport, username, siteUrl }: Props) {
  const [fixtures, setFixtures] = useState<Fixture[]>(initialFixtures)
  const predictionMap = useMemo(() => new Map<string, Prediction>(predictions), [predictions])
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    const channel = supabase
      .channel('fixtures-rt-' + tournamentId)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'fixtures' },
        (payload) => {
          const updated = payload.new as Fixture
          setFixtures(prev =>
            prev.map(f => f.id === updated.id ? { ...f, status: updated.status, home_score: updated.home_score, away_score: updated.away_score } : f)
          )
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [tournamentId])

  const maxScore = tournamentSport === 'basketball' ? 200 : 20

  const sortedStages = useMemo(() => {
    const now = new Date()
    const stages = Array.from(
      fixtures.reduce((acc, f) => {
        if (!acc.has(f.stage)) acc.set(f.stage, [])
        acc.get(f.stage)!.push(f)
        return acc
      }, new Map<string, Fixture[]>())
    )
    return stages
      .map(([stage, stageFixtures]) => {
        const sorted = [...stageFixtures].sort((a, b) => {
          const orderDiff = fixtureOrder(a, now) - fixtureOrder(b, now)
          if (orderDiff !== 0) return orderDiff
          return new Date(a.kickoff_time).getTime() - new Date(b.kickoff_time).getTime()
        })
        return [stage, sorted] as [string, Fixture[]]
      })
      .sort(([, aF], [, bF]) => {
        const aOrder = Math.min(...aF.map(f => fixtureOrder(f, now)))
        const bOrder = Math.min(...bF.map(f => fixtureOrder(f, now)))
        return aOrder - bOrder
      })
  }, [fixtures])

  return (
    <div className="space-y-8">
      {sortedStages.map(([stage, stageFixtures]) => (
        <div key={stage}>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-fg-3">{stage}</h2>
          <div className="space-y-3">
            {stageFixtures.map(fixture => {
              const locked = fixture.status !== 'scheduled' || new Date(fixture.kickoff_time) <= new Date()
              return (
                <FixtureCard
                  key={fixture.id}
                  fixture={fixture}
                  tournamentId={tournamentId}
                  existing={predictionMap.get(fixture.id) ?? null}
                  locked={locked}
                  maxScore={maxScore}
                  username={username}
                  siteUrl={siteUrl}
                />
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
