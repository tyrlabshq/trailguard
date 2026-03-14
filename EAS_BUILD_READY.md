# TrailGuard EAS Build Environment - Ready Check

**Date:** 2026-03-14  
**Task ID:** 949  
**Status:** ✅ Environment Ready — 1 Manual Step Remaining

---

## Environment Check Results

| Check | Status | Details |
|-------|--------|---------|
| eas-cli installed | ✅ | v18.3.0 (darwin-arm64, node-v22.22.0) |
| Project type | ✅ | React Native CLI (not Expo managed) |
| autoIncrement | ✅ | Enabled in production profile |
| Mapbox token (keychain) | ✅ | Found (pk.eyJ1I...) |
| Supabase env vars | ✅ | Found in .env.production |
| ascAppId | ❌ | Placeholder — **requires manual update** |

---

## Current eas.json Configuration

```json
{
  "cli": { "version": ">= 5.0.0" },
  "build": {
    "production": {
      "autoIncrement": true,
      "env": { "EXPO_PUBLIC_ENV": "production" }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "tj.clawdbot@gmail.com",
        "ascAppId": "[TY_TO_FILL_FROM_APP_STORE_CONNECT]",
        "bundleIdentifier": "com.trailguard.app"
      }
    }
  }
}
```

---

## Secrets to Configure

The following secrets need to be created in EAS:

| Secret Name | Source | Status |
|-------------|--------|--------|
| `MAPBOX_ACCESS_TOKEN` | Keychain + .env.production | ⏳ Pending creation |
| `SUPABASE_URL` | .env.production | ⏳ Pending creation |
| `SUPABASE_ANON_KEY` | .env.production | ⏳ Pending creation |

---

## 3 Steps to Deploy

### Step 1: Update ascAppId in eas.json

Get the App Store Connect App ID for bundle ID `com.trailguard.app` and update `eas.json`:

1. Log into [App Store Connect](https://appstoreconnect.apple.com)
2. Go to **My Apps** → **TrailGuard**
3. Find the App ID (numeric value, usually 9-10 digits)
4. Update `eas.json` — replace `[TY_TO_FILL_FROM_APP_STORE_CONNECT]` with the actual ID

```bash
cd ~/.openclaw/workspace/projects/trailguard/app
# Edit eas.json — replace ascAppId placeholder
```

---

### Step 2: Create EAS Secrets

Run these 3 commands from the app directory:

```bash
cd ~/.openclaw/workspace/projects/trailguard/app

# 1. Mapbox Access Token
npx eas-cli secret:create --name MAPBOX_ACCESS_TOKEN --value "pk.eyJ1***************" --scope project

# 2. Supabase URL  
npx eas-cli secret:create --name SUPABASE_URL --value "https://ekrdvptkeagygkhujnvl.supabase.co" --scope project

# 3. Supabase Anon Key
npx eas-cli secret:create --name SUPABASE_ANON_KEY --value "eyJhbGci***************" --scope project
```

> **Note:** Full values are in `.env.production` — use those exact values when running the commands.

---

### Step 3: Trigger Production Build

```bash
cd ~/.openclaw/workspace/projects/trailguard/app
npx eas-cli build --platform ios --profile production
```

This will:
- Increment the build number automatically (`autoIncrement: true`)
- Use the production environment variables
- Submit to App Store Connect (if `ascAppId` is correctly set)

---

## Post-Build

After the build completes successfully:
- Download the IPA from EAS dashboard
- Or configure automatic submission to TestFlight by adding `submit` configuration

---

## Reference Files

- **Project:** `~/.openclaw/workspace/projects/trailguard/app/`
- **eas.json:** `~/.openclaw/workspace/projects/trailguard/app/eas.json`
- **Env file:** `~/.openclaw/workspace/projects/trailguard/app/.env.production`
