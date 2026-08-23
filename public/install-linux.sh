#!/bin/bash
# Torii installer for Linux (AppImage).
#
#   curl -fsSL https://lazer.shikkesora.com/install-linux.sh | bash
#   curl -fsSL https://lazer.shikkesora.com/install-linux.sh | bash -s -- nova
#
# Downloads the latest AppImage for this machine into ~/.local/bin, adds Torii to
# your application menu (desktop entry + icon + osu:// link handling), and opens
# it. Torii keeps itself updated from there. Nothing needs root.
#
# Options (after "bash -s --"): torii | nova   the channel, default torii
#                               --no-launch    install but don't open it

set -euo pipefail

REPO="ShikkesoraSIM/torii-osu"
STREAM="torii"
LAUNCH=1

for arg in "$@"; do
  case "$arg" in
    torii|nova|vanilla) STREAM="$arg" ;;
    --no-launch) LAUNCH=0 ;;
    *) echo "unknown option: $arg" >&2; exit 1 ;;
  esac
done

case "$(uname -m)" in
  x86_64) ASSET="torii-linux-x64.AppImage" ;;
  aarch64|arm64) ASSET="torii-linux-arm64.AppImage" ;;
  *) echo "Unsupported architecture: $(uname -m)" >&2; exit 1 ;;
esac

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

BIN_DIR="$HOME/.local/bin"
APPS_DIR="$HOME/.local/share/applications"
ICON_DIR="$HOME/.local/share/icons/hicolor/256x256/apps"
mkdir -p "$BIN_DIR" "$APPS_DIR" "$ICON_DIR"

TARGET="$BIN_DIR/torii.AppImage"

echo "Torii $TAG ($ASSET)"
echo "Downloading..."
curl -fL --progress-bar "https://github.com/$REPO/releases/download/$TAG/$ASSET" -o "$TARGET.part"
mv -f "$TARGET.part" "$TARGET"
chmod +x "$TARGET"

# icon: pulled out of the AppImage itself so it always matches the build.
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
(
  cd "$TMP"
  "$TARGET" --appimage-extract '*.png' >/dev/null 2>&1 || true
  ICON=$(find "$TMP/squashfs-root" -maxdepth 1 -name '*.png' 2>/dev/null | head -1 || true)
  if [ -n "${ICON:-}" ]; then
    cp -f "$ICON" "$ICON_DIR/torii.png"
  fi
)

cat > "$APPS_DIR/torii.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Torii
Comment=osu!lazer, the Torii way
Exec=$TARGET %U
Icon=torii
Terminal=false
Categories=Game;
MimeType=x-scheme-handler/osu;x-scheme-handler/osump;application/x-osu-beatmap-archive;application/x-osu-skin-archive;application/x-osu-replay;
StartupWMClass=torii
EOF

update-desktop-database "$APPS_DIR" >/dev/null 2>&1 || true
gtk-update-icon-cache -f -t "$HOME/.local/share/icons/hicolor" >/dev/null 2>&1 || true

echo "Installed: $TARGET (also in your application menu as Torii)"

if ! command -v fusermount >/dev/null 2>&1 && ! command -v fusermount3 >/dev/null 2>&1; then
  echo
  echo "Note: AppImages need FUSE. If Torii doesn't start, install it:"
  echo "  Debian/Ubuntu: sudo apt install libfuse2    Fedora: sudo dnf install fuse    Arch: sudo pacman -S fuse2"
fi

if [ "$LAUNCH" = "1" ]; then
  nohup "$TARGET" >/dev/null 2>&1 &
fi
