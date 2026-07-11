#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SMARTPERFETTO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PERFETTO_SKILLS_DIR="${PERFETTO_SKILLS_DIR:-$(cd "$SMARTPERFETTO_DIR/.." && pwd)/Perfetto-Skills}"

if [[ ! -d "$PERFETTO_SKILLS_DIR/.git" && ! -f "$PERFETTO_SKILLS_DIR/.git" ]]; then
  echo "Perfetto-Skills checkout not found at: $PERFETTO_SKILLS_DIR" >&2
  echo "Clone Gracker/Perfetto-Skills beside SmartPerfetto or set PERFETTO_SKILLS_DIR." >&2
  exit 2
fi

EXPORTER="$PERFETTO_SKILLS_DIR/tools/export_from_smartperfetto.py"
VALIDATOR="$PERFETTO_SKILLS_DIR/tools/validate_catalog.py"
if [[ ! -f "$EXPORTER" || ! -f "$VALIDATOR" ]]; then
  echo "Perfetto-Skills checkout is missing export verification tools: $PERFETTO_SKILLS_DIR" >&2
  exit 2
fi

python3 "$EXPORTER" --source "$SMARTPERFETTO_DIR" --check
python3 "$VALIDATOR" \
  --catalog "$PERFETTO_SKILLS_DIR/catalog/smartperfetto-export.json" \
  --skill-root "$PERFETTO_SKILLS_DIR/skills/perfetto-performance-analysis"
