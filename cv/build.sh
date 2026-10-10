#!/bin/sh
# Renders cv/{ru,en}.html into the PDFs the home page links to.
set -e
CHROME="${CHROME:-/Applications/Brave Browser.app/Contents/MacOS/Brave Browser}"
cd "$(dirname "$0")"
mkdir -p ../public/cv
for lang in ru en; do
  "$CHROME" --headless --disable-gpu --no-pdf-header-footer \
    --print-to-pdf="../public/cv/andrey-sobolev-cv-$lang.pdf" "file://$PWD/$lang.html"
done
