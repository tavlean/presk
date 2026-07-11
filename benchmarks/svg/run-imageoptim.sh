#!/usr/bin/env bash
# ImageOptim baseline leg of the SVG benchmark (see README.md).
# ImageOptim optimizes IN PLACE, so the corpus is copied into the external/
# tool directory first and the app is pointed at the copies. Completion is
# detected by the total-size fingerprint going quiet (the app exposes no
# scripting hook for batch completion).
#
# Provenance to record alongside results: app version (Info.plist
# CFBundleShortVersionString) and whether any net.pornel.ImageOptim prefs
# override the defaults (none = factory settings).
set -euo pipefail

cd "$(dirname "$0")"
DEST=external/imageoptim
rm -rf "$DEST"
mkdir -p "$DEST"
# Mirror the corpus's relative layout (strata subdirectories).
(cd corpus && find . -name '*.svg' -print0 | cpio -0 -pdm "../$DEST" 2>/dev/null)

find "$DEST" -name '*.svg' -print0 | xargs -0 open -a ImageOptim

fingerprint() {
  find "$DEST" -name '*.svg' -exec stat -f '%z %m' {} + | shasum | cut -d' ' -f1
}

echo "Waiting for ImageOptim to finish (size+mtime fingerprint must hold for 20s)…"
last=$(fingerprint)
stable=0
while [ "$stable" -lt 4 ]; do
  sleep 5
  now=$(fingerprint)
  if [ "$now" = "$last" ]; then
    stable=$((stable + 1))
  else
    stable=0
    last=$now
  fi
done
echo "Done. Optimized copies in $DEST"
