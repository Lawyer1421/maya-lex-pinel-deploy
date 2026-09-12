#!/usr/bin/env bash
# Regenera public/og/*.png desde los HTML de marca (Chrome headless).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CHROME="${CHROME_PATH:-/usr/local/bin/google-chrome}"
mkdir -p /tmp/maya-og
"$CHROME" --headless=new --disable-gpu --no-sandbox --hide-scrollbars \
  --user-data-dir=/tmp/maya-og --window-size=1200,630 --virtual-time-budget=4000 \
  --screenshot="$ROOT/public/og/og-image.png" "file://$ROOT/public/og/og-card.html"
"$CHROME" --headless=new --disable-gpu --no-sandbox --hide-scrollbars \
  --user-data-dir=/tmp/maya-og --window-size=1080,1080 --virtual-time-budget=4000 \
  --screenshot="$ROOT/public/og/social-square-1080.png" "file://$ROOT/public/og/social-square.html"
echo "OK: public/og/og-image.png y social-square-1080.png"
