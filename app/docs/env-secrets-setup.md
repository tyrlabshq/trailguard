# Environment Secrets Setup

## Overview

TrailGuard uses environment variables for all sensitive tokens. Tokens must never be hardcoded in source files.

---

## Required Environment Variables

| Variable | Used In | Where to Set |
|---|---|---|
| `EXPO_PUBLIC_MAPBOX_TOKEN` | `App.tsx` (JS runtime) | `.env.production`, EAS Secret |
| `MAPBOX_ACCESS_TOKEN` | `Info.plist` (iOS native SDK) | Xcode Build Setting, EAS Secret |
| `EXPO_PUBLIC_SUPABASE_URL` | `src/lib/supabase.ts` | `.env.production`, EAS Secret |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `src/lib/supabase.ts` | `.env.production`, EAS Secret |

---

## Local Development

Copy `.env.production` (not tracked by git) and fill in the values:

```bash
EXPO_PUBLIC_API_URL=https://api.trailguard.app
EXPO_PUBLIC_WS_URL=wss://api.trailguard.app
EXPO_PUBLIC_ENV=production
EXPO_PUBLIC_MAPBOX_TOKEN=pk.eyJ...   # Get from Mapbox dashboard
EXPO_PUBLIC_SUPABASE_URL=https://....supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

For iOS native (Info.plist `MBXAccessToken`), Xcode will expand `$(MAPBOX_ACCESS_TOKEN)` from your build settings. Set it in:
- **Xcode → TrailGuard target → Build Settings → User-Defined → MAPBOX_ACCESS_TOKEN**

Or create `ios/TrailGuard.xcconfig` (add to .gitignore):
```
MAPBOX_ACCESS_TOKEN = pk.eyJ...your-token-here
```

---

## EAS Build (CI / App Store)

### Step 1: Store secrets in EAS

```bash
eas secret:create --scope project --name EXPO_PUBLIC_MAPBOX_TOKEN --value "pk.eyJ1..."
eas secret:create --scope project --name MAPBOX_ACCESS_TOKEN --value "pk.eyJ1..."
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "eyJhbGci..."
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://....supabase.co"
```

### Step 2: Reference secrets in eas.json

EAS secrets are automatically injected as environment variables during the build. The `eas.json` build profiles expose them via the `env` block — but for secrets, EAS injects them without listing them explicitly (they're pulled from the EAS dashboard secrets store).

The current `eas.json` is configured for this pattern. No additional changes needed once secrets are stored via `eas secret:create`.

### Step 3: MAPBOX_ACCESS_TOKEN in Info.plist

`Info.plist` uses `$(MAPBOX_ACCESS_TOKEN)` — an Xcode build setting variable. For EAS bare builds, this is injected via a pre-build hook or xcconfig.

Add to `eas.json` under the relevant profile if you need an explicit pre-build script:

```json
{
  "build": {
    "production": {
      "prebuildCommand": "node scripts/inject-native-env.js",
      "env": {
        "EXPO_PUBLIC_ENV": "production"
      }
    }
  }
}
```

`scripts/inject-native-env.js` would write `MAPBOX_ACCESS_TOKEN` to an xcconfig file during the EAS build before Xcode compiles.

---

## Token Rotation (Ty handles this)

When rotating the Mapbox token:
1. Generate new token in [Mapbox dashboard](https://account.mapbox.com/access-tokens/)
2. Update `.env.production` locally
3. Update EAS secrets: `eas secret:push --scope project`
4. Rebuild and redeploy

---

## Why Info.plist Uses a Build Setting

The Mapbox iOS SDK reads `MBXAccessToken` from `Info.plist` before any JavaScript runs. We use `$(MAPBOX_ACCESS_TOKEN)` (an Xcode build setting variable) instead of a hardcoded string so the token stays out of the source tree and can be injected per-environment at build time.
