#!/bin/bash
# Patch Astro's bundled output for Cloudflare Workers.
#
# Astro detects Node via `typeof process !== "undefined"`, but Cloudflare Workers
# with `nodejs_compat` flag fakes `process`. Astro then picks `renderToAsyncIterable`
# (Node path), but Workers' Response constructor cannot consume async iterators —
# it stringifies them to "[object Object]", breaking every Astro page.
#
# This patch forces `isNode = false` so Astro uses `renderToReadableStream` instead.
# Upstream issue: https://github.com/withastro/astro/issues (search for nodejs_compat)

set -e

CHUNKS_DIR="dist/server/chunks"
if [ ! -d "$CHUNKS_DIR" ]; then
  echo "[patch] Skipping — $CHUNKS_DIR not found (build hasn't run)"
  exit 0
fi

PATCHED=0
for file in "$CHUNKS_DIR"/sequence_*.mjs; do
  [ -f "$file" ] || continue
  if grep -q 'const isNode = typeof process !== "undefined" && Object.prototype.toString.call(process) === "\[object process\]"' "$file"; then
    sed -i.bak 's|const isNode = typeof process !== "undefined" && Object.prototype.toString.call(process) === "\[object process\]";|const isNode = false; /* PATCHED: workerd nodejs_compat fakes process; force ReadableStream path */|' "$file"
    rm -f "$file.bak"
    echo "[patch] Patched isNode in $(basename "$file")"
    PATCHED=$((PATCHED + 1))
  fi
done

if [ $PATCHED -eq 0 ]; then
  echo "[patch] No changes — already patched or pattern not found"
fi
