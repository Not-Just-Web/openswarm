#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${OPENSWARM_ROOT:-/app}"
source "${ROOT_DIR}/shared/logger.sh"
source "${ROOT_DIR}/shared/bus.sh"

AGENT_NAME="techlead_agent"
TASK_PAYLOAD="${OPENSWARM_TASK_PAYLOAD:-{}}"

main() {
  log_info "${AGENT_NAME}" "Assessing architecture for ${TASK_PAYLOAD}"
  publish "swarm_logs" "$(message_json "${AGENT_NAME}" "main_agent" "log" "Tech lead reviewed architecture")"
}

main "$@"
