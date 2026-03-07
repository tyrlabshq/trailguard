#!/bin/bash
# TrailGuard Cloudflare Quick Tunnel
# Starts tunnel, captures URL, updates app/.env automatically.
# NOTE: URL changes on each restart. For permanent URL, set up named tunnel:
#   1. cloudflared login  (authenticates with Cloudflare account)
#   2. cloudflared tunnel create trailguard-api
#   3. Add DNS CNAME in Cloudflare dashboard: api.trailguard.dev -> <TUNNEL_ID>.cfargotunnel.com
#   4. Update this script to use the named tunnel config

LOGFILE="/tmp/trailguard-tunnel.log"
APP_ENV="/Users/ty/.openclaw/workspace/projects/trailguard/app/.env"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "[TrailGuard Tunnel] Starting cloudflared quick tunnel..."

# Start tunnel in background, write output to log
# IMPORTANT: --config /dev/null prevents cloudflared from picking up ~/.cloudflared/config.yml
# which would try to use the named quant-dashboard tunnel credentials instead of quick tunnel
/opt/homebrew/bin/cloudflared tunnel --config /dev/null --url http://localhost:8420 \
  --no-autoupdate \
  --logfile "$LOGFILE" &

TUNNEL_PID=$!
echo "[TrailGuard Tunnel] PID: $TUNNEL_PID"

# Wait for URL to appear in log (up to 30s)
for i in $(seq 1 30); do
  sleep 1
  URL=$(grep -o 'https://[a-z-]*\.trycloudflare\.com' "$LOGFILE" 2>/dev/null | tail -1)
  if [ -n "$URL" ]; then
    echo "[TrailGuard Tunnel] URL: $URL"
    
    # Update app/.env
    cat > "$APP_ENV" << EOF
EXPO_PUBLIC_API_URL=$URL
EXPO_PUBLIC_WS_URL=${URL/https/wss}
EOF
    echo "[TrailGuard Tunnel] Updated $APP_ENV"
    break
  fi
done

if [ -z "$URL" ]; then
  echo "[TrailGuard Tunnel] WARNING: Could not extract tunnel URL from log"
fi

# Keep tunnel running
wait $TUNNEL_PID
