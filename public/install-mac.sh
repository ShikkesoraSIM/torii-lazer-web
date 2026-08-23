#!/bin/bash
# Torii installer / updater for macOS.
#
#   curl -fsSL https://lazer.shikkesora.com/install-mac.sh | bash
#   curl -fsSL https://lazer.shikkesora.com/install-mac.sh | bash -s -- nova
#
# Downloads the latest release for this Mac (Apple Silicon or Intel), puts
# Torii.app in your Applications folder, clears the download quarantine flag
# (Torii isn't signed with a paid Apple certificate, so without this macOS says
# "damaged"), gives it a local signature, and opens it. Running it again updates
# in place. No password needed for a normal account; nothing else is touched.
#
# Options (after "bash -s --"): torii | nova   the channel, default torii
#                               --relaunch     wait for a running Torii to quit first
#                               --no-launch    install but don't open it

set -euo pipefail

REPO="ShikkesoraSIM/torii-osu"
STREAM="torii"
RELAUNCH=0
LAUNCH=1

for arg in "$@"; do
  case "$arg" in
    torii|nova|vanilla) STREAM="$arg" ;;
    --relaunch) RELAUNCH=1 ;;
    --no-launch) LAUNCH=0 ;;
    *) echo "unknown option: $arg" >&2; exit 1 ;;
  esac
done

case "$(uname -m)" in
  arm64) ASSET="Torii-macOS-AppleSilicon.zip"; CHIP="Apple Silicon" ;;
  x86_64) ASSET="Torii-macOS-Intel.zip"; CHIP="Intel" ;;
  *) echo "Unsupported Mac architecture: $(uname -m)" >&2; exit 1 ;;
esac

# newest tag of the channel. stable = the newest non-prerelease; nova/vanilla are
# prereleases, so they're picked by tag suffix from the recent list.
# candidatos: los tags del stream, de mas nuevo a mas viejo. el JSON se baja
# entero primero: con pipefail, un grep/head que cierra el pipe antes de tiempo
# mata a curl con codigo 23 y el script abortaria sin decir nada.
JSON=$(curl -fsSL "https://api.github.com/repos/$REPO/releases?per_page=50" || true)
if [ "$STREAM" = "torii" ]; then
  # estable = no prerelease: el tag termina en -torii (o -lazer en los viejos).
  CANDIDATES=$(printf '%s\n' "$JSON" | sed -nE 's/.*"tag_name": *"([^"]+)".*/\1/p' | grep -E -- '-(torii|lazer)$' || true)
else
  CANDIDATES=$(printf '%s\n' "$JSON" | sed -nE 's/.*"tag_name": *"([^"]+)".*/\1/p' | grep -- "-$STREAM\$" || true)
fi

if [ -z "${CANDIDATES:-}" ]; then
  echo "Couldn't list the $STREAM releases (GitHub API unreachable or rate limited). Try again in a minute." >&2
  exit 1
fi

# la release mas nueva que realmente tenga el archivo de esta maquina: una build
# en curso, o una release vieja con otros nombres, no sirven.
TAG=""
for candidate in $(printf '%s\n' "$CANDIDATES" | sed -n '1,8p'); do
  code=$(curl -sIL -o /dev/null -w '%{http_code}' "https://github.com/$REPO/releases/download/$candidate/$ASSET" || true)
  if [ "$code" = "200" ]; then
    TAG="$candidate"
    break
  fi
done

if [ -z "$TAG" ]; then
  echo "No recent $STREAM release has $ASSET yet. Try again in a little while." >&2
  exit 1
fi

URL="https://github.com/$REPO/releases/download/$TAG/$ASSET"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

echo "Torii $TAG for $CHIP"
echo "Downloading $ASSET ..."
curl -fL --progress-bar "$URL" -o "$TMP/torii.zip"

# ditto keeps permissions and bundle structure intact, unlike unzip on some setups.
ditto -x -k "$TMP/torii.zip" "$TMP/unzipped"
APP=$(find "$TMP/unzipped" -maxdepth 2 -type d -name "Torii.app" | sed -n '1p')

if [ -z "$APP" ]; then
  echo "The download didn't contain Torii.app. Please report this." >&2
  exit 1
fi

DEST="/Applications"
if [ ! -w "$DEST" ]; then
  DEST="$HOME/Applications"
  mkdir -p "$DEST"
fi

if [ "$RELAUNCH" = "1" ]; then
  # called from inside Torii to update itself: give the running copy a moment to quit.
  for _ in $(seq 1 30); do
    pgrep -x torii >/dev/null 2>&1 || break
    sleep 1
  done
fi

xattr -dr com.apple.quarantine "$APP" 2>/dev/null || true
codesign --force --deep --sign - "$APP" 2>/dev/null || true

rm -rf "$DEST/Torii.app"
cp -R "$APP" "$DEST/"
xattr -dr com.apple.quarantine "$DEST/Torii.app" 2>/dev/null || true

echo "Installed: $DEST/Torii.app"

if [ "$LAUNCH" = "1" ]; then
  open "$DEST/Torii.app"
fi
