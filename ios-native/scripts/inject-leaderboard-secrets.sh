#!/bin/sh
# inject-leaderboard-secrets.sh
# Changes: Copy VITE_SUPABASE_* (CI env or repo .env) into the built Info.plist.
# Never prints the key. Missing credentials leave SPACE BOARD offline — game still runs.

set -eu

load_kv() {
  _key="$1"
  _file="$2"
  grep -E "^${_key}=" "$_file" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '\r' | sed 's/^["'\'']//;s/["'\'']$//'
}

URL="${VITE_SUPABASE_URL:-}"
KEY="${VITE_SUPABASE_ANON_KEY:-}"
ENV_FILE="${SRCROOT:-}/../.env"

if [ -z "$URL" ] && [ -n "${SRCROOT:-}" ] && [ -f "$ENV_FILE" ]; then
  URL="$(load_kv VITE_SUPABASE_URL "$ENV_FILE")"
  KEY="$(load_kv VITE_SUPABASE_ANON_KEY "$ENV_FILE")"
fi

PLIST="${TARGET_BUILD_DIR:-}/${INFOPLIST_PATH:-}"
if [ ! -f "$PLIST" ]; then
  echo "inject-leaderboard-secrets: Info.plist not ready, skipping"
  exit 0
fi

if [ -z "$URL" ] || [ -z "$KEY" ]; then
  echo "inject-leaderboard-secrets: VITE_SUPABASE_* unset — SPACE BOARD offline"
  exit 0
fi

/usr/libexec/PlistBuddy -c "Set :SUPABASE_URL ${URL}" "$PLIST"
/usr/libexec/PlistBuddy -c "Set :SUPABASE_ANON_KEY ${KEY}" "$PLIST"
echo "inject-leaderboard-secrets: wrote SUPABASE_URL"
