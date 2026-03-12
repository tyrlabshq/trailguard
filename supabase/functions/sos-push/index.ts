/**
 * sos-push — Supabase Edge Function (Task #803)
 *
 * Sends APNs remote push notifications to all group members when an SOS
 * alert fires, so riders whose apps are killed still receive the alert.
 *
 * Called by the TrailGuard app immediately after inserting an sos_alerts row
 * (src/api/sos.ts → createSOSAlert).
 *
 * Request body (JSON):
 *   {
 *     "alertId"  : "<sos_alerts.id>",
 *     "groupId"  : "<group UUID>",
 *     "userId"   : "<alert sender UUID>",   // excluded from push recipients
 *     "lat"      : 44.123,
 *     "lng"      : -84.456,
 *     "riderName": "Tyler",                 // optional — shown in push body
 *   }
 *
 * Supabase secrets required (set with `supabase secrets set`):
 *   APNS_KEY_ID      10-character APNs Auth Key ID from Apple Dev Portal
 *   APNS_TEAM_ID     10-character Apple Developer Team ID
 *   APNS_PRIVATE_KEY Contents of the .p8 auth key file (EC private key, PEM)
 *   APNS_BUNDLE_ID   App bundle identifier, e.g. com.trailguard.app
 *   APNS_ENV         "sandbox" | "production"  (defaults to "sandbox")
 *
 * APNs Auth Key setup:
 *   1. Apple Dev Portal → Certificates, Identifiers & Profiles → Keys
 *   2. Create a new key, enable "Apple Push Notifications service (APNs)"
 *   3. Download the .p8 file (only downloadable once — store it securely)
 *   4. Note the Key ID shown on the key detail page
 *   5. supabase secrets set APNS_PRIVATE_KEY="$(cat AuthKey_XXXXXXXXXX.p8)"
 *      supabase secrets set APNS_KEY_ID=XXXXXXXXXX
 *      supabase secrets set APNS_TEAM_ID=YYYYYYYYYY
 *      supabase secrets set APNS_BUNDLE_ID=com.trailguard.app
 *      supabase secrets set APNS_ENV=sandbox
 *   6. supabase functions deploy sos-push
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SOSPushRequest {
  alertId: string
  groupId: string
  userId: string      // sender — excluded from recipients
  lat: number
  lng: number
  riderName?: string | null
}

interface DeviceToken {
  user_id: string
  token: string
  platform: string
}

// ─── CORS headers ─────────────────────────────────────────────────────────────

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── APNs JWT helpers ─────────────────────────────────────────────────────────

/**
 * Convert a PEM-encoded PKCS#8 EC private key to a CryptoKey.
 * APNs auth keys (.p8 files) use PKCS#8 / P-256.
 */
async function importApnsKey(pem: string): Promise<CryptoKey> {
  // Strip PEM header/footer and decode base64
  const pemBody = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '')

  const der = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0))

  return crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  )
}

/**
 * Encode a value as URL-safe base64 (no padding).
 */
function base64url(data: ArrayBuffer | Uint8Array): string {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data)
  let str = ''
  for (const b of bytes) str += String.fromCharCode(b)
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

/**
 * Generate a signed APNs Provider Authentication Token (JWT).
 * Tokens are valid for 60 minutes; generate fresh per request to stay safe.
 */
async function generateApnsJwt(
  teamId: string,
  keyId: string,
  privateKey: CryptoKey,
): Promise<string> {
  const header = base64url(
    new TextEncoder().encode(JSON.stringify({ alg: 'ES256', kid: keyId })),
  )
  const payload = base64url(
    new TextEncoder().encode(
      JSON.stringify({ iss: teamId, iat: Math.floor(Date.now() / 1000) }),
    ),
  )
  const signingInput = `${header}.${payload}`
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(signingInput),
  )
  return `${signingInput}.${base64url(signature)}`
}

// ─── APNs send ────────────────────────────────────────────────────────────────

/**
 * Send a single APNs push notification.
 * Returns true on success, false on failure (logs the reason).
 */
async function sendApnsPush(
  token: string,
  jwt: string,
  bundleId: string,
  apnsEnv: string,
  payload: Record<string, unknown>,
): Promise<boolean> {
  const host =
    apnsEnv === 'production'
      ? 'https://api.push.apple.com'
      : 'https://api.sandbox.push.apple.com'

  const url = `${host}/3/device/${token}`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'apns-topic': bundleId,
        'apns-push-type': 'alert',
        'apns-priority': '10',
        'apns-expiration': '0',
        authorization: `bearer ${jwt}`,
      },
      body: JSON.stringify(payload),
    })

    if (res.ok) return true

    const body = await res.text().catch(() => '')
    console.warn(`[sos-push] APNs rejected token ${token.slice(-8)}: ${res.status} ${body}`)
    return false
  } catch (err) {
    console.warn(`[sos-push] APNs fetch error for token ${token.slice(-8)}:`, err)
    return false
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // ── Auth: require caller to be authenticated ──────────────────────────────
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Verify the caller is a valid signed-in user
  const authHeader = req.headers.get('authorization') ?? ''
  const callerClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { authorization: authHeader } } },
  )
  const {
    data: { user },
  } = await callerClient.auth.getUser()
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // ── Parse request body ────────────────────────────────────────────────────
  let body: SOSPushRequest
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { alertId, groupId, userId, lat, lng, riderName } = body
  if (!alertId || !groupId || !userId) {
    return new Response(JSON.stringify({ error: 'alertId, groupId, userId required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // ── Load APNs credentials from env secrets ────────────────────────────────
  const apnsKeyId = Deno.env.get('APNS_KEY_ID')
  const apnsTeamId = Deno.env.get('APNS_TEAM_ID')
  const apnsPrivateKeyPem = Deno.env.get('APNS_PRIVATE_KEY')
  const apnsBundleId = Deno.env.get('APNS_BUNDLE_ID') ?? 'com.trailguard.app'
  const apnsEnv = Deno.env.get('APNS_ENV') ?? 'sandbox'

  if (!apnsKeyId || !apnsTeamId || !apnsPrivateKeyPem) {
    console.error('[sos-push] Missing APNs secrets — cannot send remote push.')
    // Don't fail the request; the in-app realtime broadcast is still active.
    // Return 200 so the app doesn't treat this as a hard error.
    return new Response(
      JSON.stringify({ sent: 0, error: 'APNs secrets not configured' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  // ── Look up group members' device tokens ──────────────────────────────────
  // Join group_members → device_tokens, excluding the SOS sender.
  const { data: tokens, error: tokensErr } = await supabase
    .from('group_members')
    .select('rider_id, device_tokens!inner(token, platform)')
    .eq('group_id', groupId)
    .neq('rider_id', userId)  // Don't push to the sender

  if (tokensErr) {
    console.error('[sos-push] Token lookup failed:', tokensErr.message)
    return new Response(JSON.stringify({ error: tokensErr.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!tokens || tokens.length === 0) {
    return new Response(JSON.stringify({ sent: 0, reason: 'no recipients with tokens' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // ── Build APNs payload ────────────────────────────────────────────────────
  const senderLabel = riderName ?? 'A group member'
  const coordsText = `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  const apnsPayload = {
    aps: {
      alert: {
        title: `🚨 SOS — ${senderLabel} needs help!`,
        body: `📍 ${coordsText}`,
      },
      sound: 'default',
      badge: 1,
      // content-available: 1 enables silent background wakeup as a fallback
      'content-available': 1,
      // mutable-content: 1 allows a notification service extension to
      // attach a map thumbnail in a future enhancement
      'mutable-content': 1,
    },
    // Custom data available to the app on tap
    alertId,
    groupId,
    userId,
    lat,
    lng,
  }

  // ── Sign JWT and send to each recipient ───────────────────────────────────
  let apnsKey: CryptoKey
  try {
    apnsKey = await importApnsKey(apnsPrivateKeyPem)
  } catch (err) {
    console.error('[sos-push] Failed to import APNs private key:', err)
    return new Response(JSON.stringify({ error: 'Invalid APNs private key' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const jwt = await generateApnsJwt(apnsTeamId, apnsKeyId, apnsKey)

  // Flatten the nested join result to get individual token strings
  const iosTokens: string[] = (tokens as Array<{ device_tokens: DeviceToken | DeviceToken[] }>)
    .flatMap((row) => {
      const dt = row.device_tokens
      const entries = Array.isArray(dt) ? dt : [dt]
      return entries
        .filter((t) => t.platform === 'ios' && t.token)
        .map((t) => t.token)
    })

  // Send all pushes concurrently; log failures but don't abort
  const results = await Promise.all(
    iosTokens.map((token) =>
      sendApnsPush(token, jwt, apnsBundleId, apnsEnv, apnsPayload),
    ),
  )

  const sent = results.filter(Boolean).length
  console.log(`[sos-push] Sent ${sent}/${iosTokens.length} APNs pushes for alert ${alertId}`)

  return new Response(
    JSON.stringify({ sent, total: iosTokens.length }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
