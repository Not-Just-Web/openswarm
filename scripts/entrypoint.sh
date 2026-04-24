#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${OPENSWARM_ROOT:-/app}"
LOG_DIR="${ROOT_DIR}/runtime/logs"
mkdir -p "${LOG_DIR}" "${ROOT_DIR}/runtime/pids"

redis-server --daemonize yes
ollama serve >> "${LOG_DIR}/ollama.log" 2>&1 &

"${ROOT_DIR}/scripts/bootstrap.sh" >> "${LOG_DIR}/bootstrap.log" 2>&1 || true

node "${ROOT_DIR}/dashboard/server.js" >> "${LOG_DIR}/dashboard.log" 2>&1 &

exec "${ROOT_DIR}/agents/main_agent.sh"
