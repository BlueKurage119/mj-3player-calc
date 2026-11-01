#!/usr/bin/env sh
set -eu

if [ $# -lt 1 ]; then
  echo "Usage: $0 <path-to-upstream-Regular-dir>" >&2
  exit 1
fi

SRC_DIR="$1"
if [ ! -d "$SRC_DIR" ]; then
  echo "Error: Directory not found: $SRC_DIR" >&2
  exit 1
fi

TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT INT TERM

TILES="
Front.svg
Back.svg
Man1.svg
Man9.svg
Pin1.svg
Pin2.svg
Pin3.svg
Pin4.svg
Pin5.svg
Pin6.svg
Pin7.svg
Pin8.svg
Pin9.svg
Pin5-Dora.svg
Sou1.svg
Sou2.svg
Sou3.svg
Sou4.svg
Sou5.svg
Sou6.svg
Sou7.svg
Sou8.svg
Sou9.svg
Sou5-Dora.svg
Ton.svg
Nan.svg
Shaa.svg
Pei.svg
Haku.svg
Hatsu.svg
Chun.svg
"

for file in $TILES; do
  [ -z "$file" ] && continue
  if [ ! -f "$SRC_DIR/$file" ]; then
    echo "Error: File not found in source: $SRC_DIR/$file" >&2
    exit 1
  fi
  cp "$SRC_DIR/$file" "$TMP_DIR/$file"
done

mkdir -p src/ui/tile/assets
npx svgo --config svgo.tiles.config.mjs -f "$TMP_DIR" -o src/ui/tile/assets

echo "Successfully optimized 31 tiles to src/ui/tile/assets."
