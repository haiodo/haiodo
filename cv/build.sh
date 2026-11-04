#!/bin/sh
# Generates HTML and Markdown from resume.yaml and publishes the PDF and Markdown downloads.
set -e
CHROME="${CHROME:-/Applications/Brave Browser.app/Contents/MacOS/Brave Browser}"
cd "$(dirname "$0")"
node generate.mjs
node generate-human.mjs
mkdir -p ../public/cv
for lang in ru en; do
  cp "$lang.md" "../public/cv/andrey-sobolev-cv-$lang.md"
  "$CHROME" --headless --disable-gpu --no-pdf-header-footer \
    --print-to-pdf="../public/cv/andrey-sobolev-cv-$lang.pdf" "file://$PWD/$lang.html"
  "$CHROME" --headless --disable-gpu --no-pdf-header-footer \
    --print-to-pdf="../public/cv/andrey-sobolev-cv-human-$lang.pdf" "file://$PWD/human-$lang.html"
done
