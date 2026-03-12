# sos-push Edge Function — Setup Guide

Sends APNs remote push notifications to group members when an SOS fires,
so riders whose apps are killed still get the alert.

---

## Prerequisites

1. An Apple Developer account with an active App ID for `com.trailguard.app`
2. The app must have **Push Notifications** capability enabled in the Dev Portal

---

## Step 1 — Create an APNs Auth Key

1. Go to [Apple Developer Portal](https://developer.apple.com/account/resources/authkeys/list)
2. Click **+** → enable **Apple Push Notifications service (APNs)**
3. Name it (e.g. "TrailGuard APNs Key") and click **Continue → Register**
4. **Download the `.p8` file** — you only get one chance to download it
5. Note the **Key ID** (10 characters, shown on the key detail page)
6. Note your **Team ID** (shown top-right in the Dev Portal, 10 characters)

---

## Step 2 — Set Supabase Secrets

```bash
cd ~/.openclaw/workspace/projects/trailguard

# Replace the values below with your actual credentials
supabase secrets set \
  APNS_KEY_ID=XXXXXXXXXX \
  APNS_TEAM_ID=YYYYYYYYYY \
  APNS_BUNDLE_ID=com.trailguard.app \
  APNS_ENV=sandbox

# The .p8 file contents (multi-line) — use $() to inline the file
supabase secrets set APNS_PRIVATE_KEY="$(cat /path/to/AuthKey_XXXXXXXXXX.p8)"
```

Switch `APNS_ENV=production` before App Store submission.

---

## Step 3 — Deploy the Function

```bash
supabase functions deploy sos-push
```

---

## Step 4 — Apply the Database Migration

```bash
supabase db push
# or manually run:
# supabase/migrations/20260312000000_device_tokens.sql
```

---

## Step 5 — Run the Database Migration on Hosted Supabase

If using the hosted Supabase project (ekrdvptkeagygkhujnvl):

```bash
supabase db push --linked
```

Or paste the migration SQL into the Supabase Dashboard SQL editor.

---

## Troubleshooting

**"APNs secrets not configured"** — The function returns 200 with this message
  if secrets aren't set. In-app realtime push still works; only killed-app push fails.

**APNs 400 BadDeviceToken** — The stored token is stale (device re-registered).
  The next app launch will upsert a fresh token automatically.

**APNs 403 InvalidProviderToken** — JWT signing failed. Verify APNS_KEY_ID and
  APNS_TEAM_ID match the key you created. Re-download the .p8 if needed.

**Sandbox vs Production** — Always use `sandbox` for development/TestFlight.
  Use `production` for App Store builds. Mixing them causes 400 errors.

---

## Testing

```bash
# Get a valid auth token from the Supabase dashboard or app
curl -X POST https://ekrdvptkeagygkhujnvl.supabase.co/functions/v1/sos-push \
  -H "Authorization: Bearer <anon-or-user-jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "alertId": "test-123",
    "groupId": "<a real group UUID>",
    "userId": "<your user UUID — excluded from recipients>",
    "lat": 44.12345,
    "lng": -84.56789,
    "riderName": "Test Rider"
  }'
```
