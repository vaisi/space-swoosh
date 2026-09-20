#!/bin/sh
# ensure-game-center-profile.sh
# Changes: Enable Game Center on the App ID and delete stale App Store
# profiles so Codemagic fetch-signing-files --create mints one that
# includes com.apple.developer.game-center. Kept out of codemagic.yaml
# so inline Python cannot invalidate the workflow file.

set -eu

BUNDLE_ID="${1:-${BUNDLE_ID:-}}"
if [ -z "$BUNDLE_ID" ]; then
  echo "ERROR: bundle id required"
  exit 1
fi

first_id() {
  python3 -c '
import json, sys, re
raw = sys.stdin.read()
try:
    start = min(i for i in (raw.find("["), raw.find("{")) if i >= 0)
    data = json.loads(raw[start:])
except Exception:
    for line in raw.splitlines():
        m = re.search(r"^Id:\s*(\S+)", line.strip())
        if m:
            print(m.group(1))
            break
    raise SystemExit(0)
if isinstance(data, dict):
    data = data.get("data") or data.get("bundleIds") or data.get("profiles") or [data]
for item in data:
    rid = item.get("id") if isinstance(item, dict) else None
    if rid:
        print(rid)
        break
'
}

LIST_JSON=$(app-store-connect bundle-ids list \
  --bundle-id-identifier "$BUNDLE_ID" \
  --strict-match-identifier \
  --json || true)
echo "$LIST_JSON"
RID=$(printf '%s\n' "$LIST_JSON" | first_id)
if [ -z "$RID" ]; then
  LIST=$(app-store-connect bundle-ids list \
    --bundle-id-identifier "$BUNDLE_ID" \
    --strict-match-identifier || true)
  echo "$LIST"
  RID=$(printf '%s\n' "$LIST" | first_id)
fi
if [ -z "$RID" ]; then
  echo "ERROR: No App ID resource for $BUNDLE_ID"
  exit 1
fi

echo "App ID resource $RID ($BUNDLE_ID)"
CAPS=$(app-store-connect bundle-ids capabilities "$RID" || true)
echo "$CAPS"
if printf '%s\n' "$CAPS" | grep -qi "Game Center"; then
  echo "Game Center already enabled on App ID"
else
  app-store-connect bundle-ids enable-capabilities "$RID" --capability "Game Center"
fi

echo "=== Existing App Store profiles (will recreate) ==="
PROFILE_JSON=$(app-store-connect bundle-ids profiles \
  --bundle-ids "$RID" \
  --type IOS_APP_STORE \
  --json || true)
echo "$PROFILE_JSON"
printf '%s\n' "$PROFILE_JSON" | python3 -c '
import json, sys, re
raw = sys.stdin.read()
ids = []
try:
    start = min(i for i in (raw.find("["), raw.find("{")) if i >= 0)
    data = json.loads(raw[start:])
    if isinstance(data, dict):
        data = data.get("data") or data.get("profiles") or [data]
    for item in data:
        rid = item.get("id") if isinstance(item, dict) else None
        if rid:
            ids.append(rid)
except Exception:
    for line in raw.splitlines():
        m = re.search(r"^Id:\s*(\S+)", line.strip())
        if m:
            ids.append(m.group(1))
for rid in ids:
    print(rid)
' | while read -r PID; do
  [ -n "$PID" ] || continue
  echo "Deleting stale App Store profile $PID"
  app-store-connect profiles delete "$PID" --ignore-not-found || true
done
