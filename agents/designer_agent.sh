#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${OPENSWARM_ROOT:-/app}"
source "${ROOT_DIR}/shared/logger.sh"
source "${ROOT_DIR}/shared/bus.sh"

AGENT_NAME="designer_agent"
TASK_PAYLOAD="${OPENSWARM_TASK_PAYLOAD:-{}}"

main() {
  log_info "${AGENT_NAME}" "Creating UI guidance for ${TASK_PAYLOAD}"
  publish "swarm_logs" "$(message_json "${AGENT_NAME}" "dashboard" "log" "Designer agent posted UI guidance")"
}

main "$@"
