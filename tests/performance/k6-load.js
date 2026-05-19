/**
 * Performance & Load Tests — k6
 *
 * Install k6: https://k6.io/docs/getting-started/installation/
 * Run:  k6 run tests/performance/k6-load.js
 * Run with load: k6 run --vus 50 --duration 30s tests/performance/k6-load.js
 *
 * Thresholds:
 *   - p95 response time < 2000ms (page load)
 *   - p95 response time < 500ms  (API endpoints)
 *   - Error rate < 1%
 */

import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'

const errorRate       = new Rate('errors')
const loginPageLoad   = new Trend('login_page_load_ms')
const sharePageLoad   = new Trend('share_page_load_ms')
const ogImageLoad     = new Trend('og_image_load_ms')
const apiSyncLoad     = new Trend('api_sync_ms')

export const options = {
  scenarios: {
    // Smoke test — 1 user, 10 seconds
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '10s',
      tags: { scenario: 'smoke' },
    },
    // Load test — ramp up to 50 concurrent users
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 20 },  // ramp up
        { duration: '1m',  target: 50 },  // sustain
        { duration: '20s', target: 0 },   // ramp down
      ],
      tags: { scenario: 'load' },
    },
    // Spike test — simulate World Cup kick-off surge
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 200 }, // sudden spike
        { duration: '1m',  target: 200 }, // hold
        { duration: '10s', target: 0 },   // drop
      ],
      tags: { scenario: 'spike' },
    },
  },
  thresholds: {
    http_req_duration:    ['p(95)<2000'],   // 95% of requests under 2s
    'http_req_duration{page:login}':  ['p(95)<1500'],
    'http_req_duration{page:share}':  ['p(95)<1500'],
    'http_req_duration{page:og}':     ['p(95)<500'],
    errors:               ['rate<0.01'],    // less than 1% errors
    http_req_failed:      ['rate<0.05'],    // less than 5% failures
  },
}

export default function () {
  // ── Login page ──────────────────────────────────────────────────────────────
  const loginRes = http.get(`${BASE_URL}/login`, {
    tags: { page: 'login' },
  })
  loginPageLoad.add(loginRes.timings.duration)
  check(loginRes, {
    'login page status 200': r => r.status === 200,
    'login page has form':   r => r.body.includes('email') || r.body.includes('Email'),
  }) || errorRate.add(1)

  sleep(0.5)

  // ── Share page (public, no auth) ─────────────────────────────────────────────
  const shareRes = http.get(
    `${BASE_URL}/share/prediction?home=Brazil&away=Argentina&hs=2&as=1&u=loadtest&pts=3&p=1`,
    { tags: { page: 'share' } }
  )
  sharePageLoad.add(shareRes.timings.duration)
  check(shareRes, {
    'share page status 200':   r => r.status === 200,
    'share page has team name': r => r.body.includes('Brazil'),
  }) || errorRate.add(1)

  sleep(0.5)

  // ── OG image API ──────────────────────────────────────────────────────────────
  const ogRes = http.get(
    `${BASE_URL}/api/og?home=Brazil&away=Argentina&hs=2&as=1&u=loadtest&pts=3&p=1`,
    { tags: { page: 'og' } }
  )
  ogImageLoad.add(ogRes.timings.duration)
  check(ogRes, {
    'og image returns 200 or 302': r => r.status === 200 || r.status === 302,
  }) || errorRate.add(1)

  sleep(1)
}

export function handleSummary(data) {
  return {
    'tests/performance/results.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  }
}

// Inline summary helper (avoids external import requirement)
function textSummary(data, opts) {
  const indent = (opts && opts.indent) || ''
  const lines = [
    `\n${indent}=== Performance Test Summary ===`,
    `${indent}Total requests:    ${data.metrics.http_reqs?.values?.count ?? 'N/A'}`,
    `${indent}Error rate:        ${((data.metrics.errors?.values?.rate ?? 0) * 100).toFixed(2)}%`,
    `${indent}p95 response time: ${data.metrics.http_req_duration?.values?.['p(95)']?.toFixed(0) ?? 'N/A'}ms`,
    `${indent}p99 response time: ${data.metrics.http_req_duration?.values?.['p(99)']?.toFixed(0) ?? 'N/A'}ms`,
  ]
  return lines.join('\n')
}
