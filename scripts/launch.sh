#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${OPENSWARM_ROOT:-/app}"
LOG_DIR="${ROOT_DIR}/runtime/logs"

mkdir -p "${LOG_DIR}"

if ! pgrep -f "node ${ROOT_DIR}/dashboard/server.js" >/dev/null 2>&1; then
  node "${ROOT_DIR}/dashboard/server.js" >> "${LOG_DIR}/dashboard.log" 2>&1 &
fi

exec "${ROOT_DIR}/agents/main_agent.sh"
