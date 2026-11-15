#!/usr/bin/env bash
# Stills from a rendered promo for judging by eye. For maintainers; learners never run this.
#
#   dev/frames.sh <promo.mp4> <out-dir>
#
# Writes one PNG per moment (540 px wide) and sheet.png, the eight moments in a 4x2 grid.
set -euo pipefail
mp4="$1"; out="$2"
mkdir -p "$out"
# v0.2 beats: the cover, the band on the name, the marker on the name, the marker on the list,
# the list landing, all three lines, the end card, its last frame.
times=(0 1 6.2 9.6 11.4 14.4 17.8 19.6)
i=0
for t in "${times[@]}"; do
  ffmpeg -v error -y -ss "$t" -i "$mp4" -frames:v 1 -vf "scale=540:-2" "$out/f$i-${t}s.png"
  i=$((i + 1))
done
ffmpeg -v error -y -pattern_type glob -i "$out/f*.png" -vf "scale=270:480,tile=4x2:padding=6:color=white" -frames:v 1 "$out/sheet.png"
