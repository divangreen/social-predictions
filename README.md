# predictr

predictr is a social sports prediction app built with Next.js and Supabase. Users sign in with an email magic link, browse tournaments, submit score predictions before kickoff, join private leagues, compare points, and share World Cup bracket picks.

The current app supports general fixture predictions plus dedicated FIFA World Cup 2026 group/knockout flows, NBA sync, football league sync, admin score entry, and generated Open Graph share images.

## Features

- Magic-link authentication through Supabase Auth.
- Auth-protected app routes with server-side session refresh.
- Tournament listing and tournament detail pages.
- Fixture score predictions locked after kickoff.
- League creation, invite-code joining, member management, invite regeneration, and league deletion.
- Prediction feeds and profile stats.
- Admin-only fixture result entry and prediction scoring.
- FIFA World Cup 2026 group-stage picks, knockout bracket picks, champion picks, leaderboard, and public user share pages.
- Dynamic Open Graph image routes for prediction and bracket sharing.
- Sports data sync endpoints for TheSportsDB, football-data.org, and BallDontLie.
- Scheduled GitHub Actions workflow that triggers full sports-data sync every 6 hours.

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase Auth and Postgres
- `@supabase/ssr` for browser/server auth clients
- Framer Motion
- Zustand
- ESLint 9

## Project Structure

```text
social-predictions/
  src/
    app/
      admin/fixtures/             Admin score entry
      admin/world-cup/            World Cup admin surface
      api/og/                     Open Graph image routes
      api/sync/                   Sports data sync routes
      auth/confirm/               Supabase magic-link callback
      join/[code]/                Invite-code join flow
      leagues/                    League creation and detail views
      login/                      Magic-link sign in
      profile/                    User stats and recent results
      share/prediction/           Shareable prediction page
      tournaments/                Tournament and fixture prediction flows
      world-cup/                  World Cup bracket, knockout, leaderboard, user pages
    lib/
      admin.ts                    Admin user helper
      match-details.ts            External sports API helpers
      supabase.ts                 Browser Supabase client
      supabase-server.ts          Server Supabase client
      wc2026-bracket.ts           World Cup knockout model
      wc2026-groups.ts            World Cup group model and lock date
    types/
      database.ts                 Supabase table types
  .github/workflows/
    sync-sports-data.yml          Scheduled sync workflow
```

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Redirects signed-in users to `/tournaments`, otherwise `/login`. |
| `/login` | Sends Supabase magic links. |
| `/auth/confirm` | Confirms Supabase OTP/PKCE links and creates a `users` row if needed. |
| `/tournaments` | Lists available tournaments. |
| `/tournaments/[id]` | Shows fixtures and allows score predictions. |
| `/tournaments/[id]/fixtures/[fixtureId]` | Fixture detail page. |
| `/leagues/new` | Creates a private league for a tournament. |
| `/leagues/[id]` | League detail, feed, members, and admin controls for league creator. |
| `/join/[code]` | Joins a league by invite code. |
| `/profile` | User points, accuracy, picks, leagues, and recent scored predictions. |
| `/world-cup/bracket` | World Cup group picks. |
| `/world-cup/knockout` | World Cup knockout bracket picks. |
| `/world-cup/leaderboard` | World Cup leaderboard. |
| `/world-cup/u/[username]` | Public World Cup user picks page. |
| `/share/prediction` | Shareable prediction view. |
| `/admin/fixtures` | Admin-only fixture result entry and scoring. |
| `/admin/world-cup` | Admin-only World Cup surface. |
| `/api/sync` | Sync one league/tournament. |
| `/api/sync/all` | Sync all configured leagues/tournaments. |
| `/api/og` and `/api/og/bracket` | Dynamic Open Graph images. |

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create `.env.local`

Create `social-predictions/.env.local` with the variables below. Do not commit real secrets.

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Comma-separated Supabase auth user IDs that may access /admin routes.
ADMIN_USER_IDS=

# Used by /api/sync and /api/sync/all.
SYNC_SECRET=
CRON_SECRET=

# External sports providers.
FOOTBALL_DATA_API_KEY=
BALLDONTLIE_API_KEY=
```

Notes:

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are used by browser and server Supabase clients.
- `SUPABASE_SERVICE_ROLE_KEY` is used by the sync routes to upsert tournaments and fixtures.
- `NEXT_PUBLIC_SITE_URL` is used for Supabase magic-link redirects and should be `http://localhost:3000` locally.
- `ADMIN_USER_IDS` must contain Supabase Auth user IDs, not email addresses.
- `SYNC_SECRET` allows manual sync calls with `?secret=...`.
- `CRON_SECRET` allows bearer-token authorization for cron-style calls.
- `FOOTBALL_DATA_API_KEY` is required for football-data.org competitions such as Champions League, Premier League, and La Liga.
- `BALLDONTLIE_API_KEY` is required for NBA sync.
- TheSportsDB World Cup sync uses the public v1 API path in the current implementation.

### 3. Configure Supabase Auth

In Supabase:

- Enable email OTP/magic-link authentication.
- Add `http://localhost:3000/auth/confirm` to the local redirect URLs.
- Add your production `https://your-domain.com/auth/confirm` URL before deploying.
- Make sure authenticated users can read/write the tables needed by the app, or add RLS policies that match the app flows.

### 4. Create the database schema

This repository currently keeps the expected database shape in `src/types/database.ts`; no Supabase migration files are included. Your Supabase project needs these tables:

- `users`
- `tournaments`
- `fixtures`
- `predictions`
- `leagues`
- `league_members`
- `reactions`
- `bracket_predictions`
- `knockout_picks`

Important uniqueness/relationship expectations from the code:

- `users.id` matches Supabase Auth user IDs.
- `predictions` should support upsert on `user_id, fixture_id`.
- `bracket_predictions` should support upsert on `user_id, tournament_id, group_letter`.
- `knockout_picks` should support upsert on `user_id, tournament_id`.
- `leagues.invite_code` should be unique for invite joins.
- `fixtures.tournament_id` points at `tournaments.id`.
- `league_members` links users to leagues.

Use `src/types/database.ts` as the source of truth for column names and nullable fields.

### 5. Run the development server

```bash
npm run dev
```

Open `http://localhost:3000`.

## Available Scripts

```bash
npm run dev      # Start Next.js dev server
npm run build    # Create a production build
npm run start    # Start the production server after build
npm run lint     # Run ESLint
```

## Sports Data Sync

The app has two sync endpoints:

```text
GET /api/sync?league_id=<id>&season=<season>&secret=<SYNC_SECRET>
GET /api/sync/all?secret=<SYNC_SECRET>
```

Supported providers:

- TheSportsDB numeric league IDs, currently used for FIFA World Cup 2026 with `league_id=4429`.
- football-data.org competition codes, currently `CL`, `PL`, and `PD`.
- BallDontLie NBA sync with `league_id=nba`.

The full sync route currently syncs:

- FIFA World Cup 2026: `4429`, season `2026`
- UEFA Champions League: `CL`, season `2025-2026`
- English Premier League: `PL`, season `2025-2026`
- Spanish La Liga: `PD`, season `2025-2026`
- NBA: `nba`, season `2025-2026`

Manual examples:

```bash
curl "http://localhost:3000/api/sync/all?secret=$SYNC_SECRET"
curl "http://localhost:3000/api/sync?league_id=nba&season=2025-2026&secret=$SYNC_SECRET"
curl "http://localhost:3000/api/sync?league_id=CL&season=2025-2026&secret=$SYNC_SECRET"
```

## Scoring Rules

Fixture result scoring is handled from `/admin/fixtures`:

- Exact score: 3 points.
- Correct result only: 1 point.
- Correct result with an underdog win: +1 bonus point.
- Incorrect result: 0 points.

Predictions are only accepted while the fixture status is `scheduled` and kickoff time is still in the future. Scores must be integers from 0 to 20.

World Cup bracket lock date is defined in `src/lib/wc2026-groups.ts` as `2026-06-11T12:00:00Z`.

## Admin Access

Admin access is controlled by `ADMIN_USER_IDS`.

To make a user an admin:

1. Sign in once so the user exists in Supabase Auth.
2. Copy the user's Supabase Auth ID.
3. Add it to `ADMIN_USER_IDS`.
4. Restart the dev server or redeploy.

Admin routes are protected in `src/proxy.ts`; non-admins are redirected away from `/admin`.

## Deployment

The app is ready for Vercel-style deployment:

1. Set all required environment variables in the deployment platform.
2. Set `NEXT_PUBLIC_SITE_URL` to the production origin.
3. Add the production auth callback URL in Supabase.
4. Ensure the Supabase schema and policies are applied.
5. Run `npm run build` during deployment.

## GitHub Actions Sync

`.github/workflows/sync-sports-data.yml` runs every 6 hours and can also be started manually. It calls:

```text
${NEXT_PUBLIC_SITE_URL}/api/sync/all?secret=${SYNC_SECRET}
```

Add these GitHub repository secrets for the workflow:

- `NEXT_PUBLIC_SITE_URL`
- `SYNC_SECRET`

## Development Notes

- The app uses the Next.js App Router and server actions.
- `src/proxy.ts` refreshes Supabase sessions and protects authenticated/admin routes.
- `src/app/auth/confirm/route.ts` handles both PKCE `code` and OTP `token_hash` confirmation formats.
- Generated build output (`.next/`), dependencies (`node_modules/`), local env files, and TypeScript build info should stay uncommitted.
- Some World Cup 2026 group and knockout data is marked in code as needing verification against official FIFA announcements before the tournament.
