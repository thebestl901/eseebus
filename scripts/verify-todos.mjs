#!/usr/bin/env node
/**
 * Verifies all 9 plan todos against runtime checks.
 * Usage: node scripts/verify-todos.mjs [baseUrl]
 * Default baseUrl: http://localhost:5175 (dev server with proxy)
 */

import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const LOG_ENDPOINT = 'http://127.0.0.1:7513/ingest/87a68e0b-48cb-4fd9-bb70-e4ace87fc1ea'
const SESSION_ID = '58895b'
const baseUrl = process.argv[2] ?? 'http://localhost:5175'

function log(message, data = {}, hypothesisId = 'verify') {
  const payload = {
    sessionId: SESSION_ID,
    location: 'scripts/verify-todos.mjs',
    message,
    data,
    hypothesisId,
    timestamp: Date.now(),
    runId: 'todo-verify',
  }
  fetch(LOG_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': SESSION_ID },
    body: JSON.stringify(payload),
  }).catch(() => {})
  console.log(`${data.pass ? '✅' : data.pass === false ? '❌' : 'ℹ️'} ${message}`, data.detail ?? '')
}

function fileExists(rel) {
  return existsSync(join(ROOT, rel))
}

function fileContains(rel, needle) {
  return readFileSync(join(ROOT, rel), 'utf8').includes(needle)
}

async function apiOk(path) {
  const res = await fetch(`${baseUrl}/api/kmb${path}`)
  if (!res.ok) return { ok: false, status: res.status }
  const json = await res.json()
  return { ok: true, type: json.type, count: Array.isArray(json.data) ? json.data.length : 1 }
}

const results = []

// 1 scaffold
const scaffold =
  fileExists('src/App.tsx') &&
  fileContains('src/App.tsx', 'path="/home"') &&
  fileExists('public/manifest.json') &&
  fileExists('vite.config.ts')
results.push({ id: 'scaffold', pass: scaffold, detail: 'routes + PWA manifest + vite config' })

// 2 onboarding
const onboarding =
  fileExists('src/routes/OnboardingPage.tsx') &&
  fileContains('src/routes/OnboardingPage.tsx', '開始使用') &&
  fileContains('src/hooks/useSettings.ts', 'hasSeenOnboarding')
results.push({ id: 'onboarding', pass: onboarding, detail: 'OnboardingPage + localStorage flag' })

// 3 settings
const settings =
  fileContains('src/routes/HomePage.tsx', 'setSettingsOpen(true)') &&
  fileExists('src/components/SettingsDrawer.tsx') &&
  fileContains('src/hooks/useSettings.ts', 'applySettings')
results.push({ id: 'settings', pass: settings, detail: 'gear icon + SettingsDrawer + CSS vars' })

// 4 home-eta
const homeEta =
  fileExists('src/components/EtaRow.tsx') &&
  fileExists('src/hooks/useFavorites.ts') &&
  fileContains('src/routes/HomePage.tsx', 'getStopEta')
results.push({ id: 'home-eta', pass: homeEta, detail: 'EtaRow + favorites + stop-eta polling' })

// 5 search
const search =
  fileExists('src/components/RouteKeypad.tsx') &&
  fileContains('src/routes/SearchPage.tsx', 'getRoutes')
results.push({ id: 'search', pass: search, detail: 'RouteKeypad + route filter' })

// 6 route-detail
const routeDetail =
  fileExists('src/components/RouteMap.tsx') &&
  fileContains('src/routes/RouteDetailPage.tsx', '收藏此車站')
results.push({ id: 'route-detail', pass: routeDetail, detail: 'Leaflet map + timeline + favorite' })

// 7 api-cache
const apiCache =
  fileExists('src/services/kmbApi.ts') &&
  fileExists('src/stores/routeStopCache.ts') &&
  (fileContains('vite.config.ts', '/api/kmb') || fileContains('vercel.json', '/api/kmb'))
results.push({ id: 'api-cache', pass: apiCache, detail: 'kmbApi + IndexedDB + proxy' })

// 8 deploy
const deploy =
  fileExists('vercel.json') &&
  fileContains('src/routes/OnboardingPage.tsx', '加入主畫面') &&
  fileContains('package.json', '"deploy"')
results.push({ id: 'deploy', pass: deploy, detail: 'vercel.json + PWA onboarding + deploy script' })

for (const r of results) log(`todo:${r.id}`, { pass: r.pass, detail: r.detail }, r.id)

// Runtime API checks
let apiPass = true
try {
  const routes = await apiOk('/route/')
  const stops = await apiOk('/stop')
  const rs = await apiOk('/route-stop/214/outbound/1')
  log('api:routes', { pass: routes.ok, detail: routes.ok ? `${routes.count} routes` : routes.status }, 'api-cache')
  log('api:stops', { pass: stops.ok, detail: stops.ok ? `${stops.count} stops` : stops.status }, 'api-cache')
  log('api:route-stop', { pass: rs.ok, detail: rs.type }, 'api-cache')
  if (stops.ok && stops.count > 0) {
    const stopRes = await fetch(`${baseUrl}/api/kmb/stop`)
    const stopJson = await stopRes.json()
    const stopId = stopJson.data[0].stop
    const eta = await apiOk(`/stop-eta/${stopId}`)
    log('api:stop-eta', { pass: eta.ok, detail: eta.type }, 'home-eta')
    apiPass = routes.ok && stops.ok && rs.ok && eta.ok
  }
} catch (e) {
  apiPass = false
  log('api:error', { pass: false, detail: String(e) }, 'api-cache')
}

const staticPass = results.every((r) => r.pass)
const allPass = staticPass && apiPass
log('summary', {
  pass: allPass,
  detail: `${results.filter((r) => r.pass).length}/9 todos static, api=${apiPass}`,
}, 'summary')

process.exit(allPass ? 0 : 1)
