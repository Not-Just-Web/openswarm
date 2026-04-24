#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${OPENSWARM_ROOT:-/app}"
source "${ROOT_DIR}/shared/logger.sh"
source "${ROOT_DIR}/shared/bus.sh"

AGENT_NAME="tester_agent"
TASK_PAYLOAD="${OPENSWARM_TASK_PAYLOAD:-{}}"

main() {
  log_info "${AGENT_NAME}" "Reviewing payload ${TASK_PAYLOAD}"
  publish "swarm_logs" "$(message_json "${AGENT_NAME}" "main_agent" "log" "QA review requested")"
  if [[ -f "${ROOT_DIR}/Makefile" ]]; then
    make -C "${ROOT_DIR}" -n build >/dev/null 2>&1 || true
  fi
  publish "swarm_logs" "$(message_json "${AGENT_NAME}" "dashboard" "log" "Tester agent finished dry-run checks")"
}

main "$@"
