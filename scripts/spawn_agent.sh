#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${OPENSWARM_ROOT:-/app}"
PID_DIR="${ROOT_DIR}/runtime/pids"
LOG_DIR="${ROOT_DIR}/runtime/logs"

AGENT_NAME="${1:-}"
TASK_PAYLOAD="${2:-}"

if [[ -z "${AGENT_NAME}" ]]; then
  echo "Usage: $0 <agent_name> [task_payload_json]" >&2
  exit 1
fi

SCRIPT_PATH="${ROOT_DIR}/agents/${AGENT_NAME}.sh"
if [[ ! -x "${SCRIPT_PATH}" ]]; then
  echo "Agent script not found or not executable: ${SCRIPT_PATH}" >&2
  exit 1
fi

mkdir -p "${PID_DIR}" "${LOG_DIR}"

export OPENSWARM_TASK_PAYLOAD="${TASK_PAYLOAD}"
"${SCRIPT_PATH}" >> "${LOG_DIR}/${AGENT_NAME}.log" 2>&1 &
PID=$!
echo "${PID}" > "${PID_DIR}/${AGENT_NAME}.pid"
echo "${PID}"
