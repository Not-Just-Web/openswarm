#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${OPENSWARM_ROOT:-/app}"
source "${ROOT_DIR}/shared/logger.sh"
source "${ROOT_DIR}/shared/bus.sh"

AGENT_NAME="coder_agent"
TASK_PAYLOAD="${OPENSWARM_TASK_PAYLOAD:-{}}"

run_opencode() {
  if command -v opencode >/dev/null 2>&1; then
    opencode "Implement the following task in the current repository: ${TASK_PAYLOAD}" || true
  else
    echo "opencode CLI not available; task payload: ${TASK_PAYLOAD}"
  fi
}

main() {
  log_info "${AGENT_NAME}" "Starting task"
  publish "swarm_logs" "$(message_json "${AGENT_NAME}" "dashboard" "log" "Coder agent started work")"
  run_opencode
  publish "swarm_logs" "$(message_json "${AGENT_NAME}" "main_agent" "log" "Coder agent completed task")"
}

main "$@"
