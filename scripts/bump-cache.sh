#!/usr/bin/env bash
# bump-cache.sh — rafraîchit les ?v=... de meiji-app/index.html
#
# Calcule un jeton stable (date + hash SHA-1 court du contenu de tous les
# fichiers JS et CSS) puis remplace en une passe tous les ?v=... des balises
# <script src="js/..."> et <link href="css/..."> de l'index.
#
# Usage :
#   ./scripts/bump-cache.sh           (à lancer après chaque changement JS/CSS)
#
# Idempotent : si rien n'a changé, le jeton ne change pas.
set -euo pipefail

cd "$(dirname "$0")/.."

INDEX="meiji-app/index.html"
[[ -f "$INDEX" ]] || { echo "❌ $INDEX introuvable" >&2; exit 1; }

HASH="$(find meiji-app/js meiji-app/css -type f \( -name '*.js' -o -name '*.css' \) -print0 \
  | LC_ALL=C sort -z \
  | xargs -0 sha1sum \
  | sha1sum \
  | cut -c1-8)"
TOKEN="$(date +%Y%m%d)-${HASH}"

# Remplace tout ?v=<jeton> attaché à un fichier .js ou .css local
TMP="$(mktemp)"
sed -E 's#("[^"]*\.(js|css))\?v=[A-Za-z0-9._-]+#\1?v='"${TOKEN}"'#g' "$INDEX" > "$TMP"
mv "$TMP" "$INDEX"

COUNT="$(grep -cE '\?v=' "$INDEX" || true)"
echo "✅ Cache-bust → ?v=${TOKEN}"
echo "   ${COUNT} référence(s) mises à jour dans ${INDEX}"
