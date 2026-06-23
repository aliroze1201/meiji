#!/usr/bin/env bash
# install-pre-commit.sh — installe un hook git qui exécute bump-cache.sh
# automatiquement à chaque commit touchant un fichier JS ou CSS du front.
#
# À lancer une seule fois après clone :
#   ./scripts/install-pre-commit.sh
set -euo pipefail

cd "$(dirname "$0")/.."

HOOK_DIR="$(git rev-parse --git-path hooks)"
HOOK_FILE="${HOOK_DIR}/pre-commit"

cat > "$HOOK_FILE" <<'EOF'
#!/usr/bin/env bash
# Auto-installé par scripts/install-pre-commit.sh
set -euo pipefail
CHANGED="$(git diff --cached --name-only --diff-filter=ACMR | grep -E '^meiji-app/(js|css)/' || true)"
[[ -z "$CHANGED" ]] && exit 0
./scripts/bump-cache.sh
git add meiji-app/index.html
EOF

chmod +x "$HOOK_FILE"
echo "✅ Hook pre-commit installé : ${HOOK_FILE}"
echo "   Le cache-busting sera mis à jour automatiquement à chaque commit"
echo "   touchant meiji-app/js/** ou meiji-app/css/**."
