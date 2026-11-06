#!/bin/sh
# Packs the templates into a zip LaraPaper can import (Plugins → Import).
set -e
cd "$(dirname "$0")"
rm -rf .zip && mkdir -p .zip/src
cp settings.yml shared.liquid full.liquid half_horizontal.liquid half_vertical.liquid quadrant.liquid .zip/src/
rm -f fasto-larapaper.zip
(cd .zip && zip -qr ../fasto-larapaper.zip src)
rm -rf .zip
echo "Built trmnl/fasto-larapaper.zip"
