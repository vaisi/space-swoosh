#!/bin/sh
# inject-leaderboard-secrets.sh
# Changes: Also copy VITE_REVENUECAT_IOS_KEY into Info.plist for ship IAP.
# Never prints secrets. Missing keys leave SPACE BOARD / store offline — game still runs.

set -eu

load_kv() {
  _key="$1"
  _file="$2"
  grep -E "^${_key}=" "$_file" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '\r' | sed 's/^["'\'']//;s/["'\'']$//'
}

URL="${VITE_SUPABASE_URL:-}"
KEY="${VITE_SUPABASE_ANON_KEY:-}"
RC_KEY="${VITE_REVENUECAT_IOS_KEY:-}"
ENV_FILE="${SRCROOT:-}/../.env"

if [ -n "${SRCROOT:-}" ] && [ -f "$ENV_FILE" ]; then
  if [ -z "$URL" ]; then
    URL="$(load_kv VITE_SUPABASE_URL "$ENV_FILE")"
    KEY="$(load_kv VITE_SUPABASE_ANON_KEY "$ENV_FILE")"
  fi
  if [ -z "$RC_KEY" ]; then
    RC_KEY="$(load_kv VITE_REVENUECAT_IOS_KEY "$ENV_FILE")"
  fi
fi

PLIST="${TARGET_BUILD_DIR:-}/${INFOPLIST_PATH:-}"
if [ ! -f "$PLIST" ]; then
  echo "inject-leaderboard-secrets: Info.plist not ready, skipping"
  exit 0
fi

if [ -n "$URL" ] && [ -n "$KEY" ]; then
  /usr/libexec/PlistBuddy -c "Set :SUPABASE_URL ${URL}" "$PLIST"
  /usr/libexec/PlistBuddy -c "Set :SUPABASE_ANON_KEY ${KEY}" "$PLIST"
  echo "inject-leaderboard-secrets: wrote SUPABASE_URL"
else
  echo "inject-leaderboard-secrets: VITE_SUPABASE_* unset — SPACE BOARD offline"
fi

if [ -n "$RC_KEY" ]; then
  /usr/libexec/PlistBuddy -c "Set :REVENUECAT_IOS_KEY ${RC_KEY}" "$PLIST"
  echo "inject-leaderboard-secrets: wrote REVENUECAT_IOS_KEY"
else
  echo "inject-leaderboard-secrets: VITE_REVENUECAT_IOS_KEY unset — IAP offline"
fi
