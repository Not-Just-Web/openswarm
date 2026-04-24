#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${OPENSWARM_ROOT:-/app}"
LOG_DIR="${ROOT_DIR}/runtime/logs"
mkdir -p "${LOG_DIR}" "${ROOT_DIR}/runtime/pids"

# Run bootstrap (models are pulled from the external ollama container)
"${ROOT_DIR}/scripts/bootstrap.sh" >> "${LOG_DIR}/bootstrap.log" 2>&1 || true

# Execute main agent
exec "${ROOT_DIR}/agents/main_agent.sh"
