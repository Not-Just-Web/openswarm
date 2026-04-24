#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${OPENSWARM_ROOT:-/app}"
PID_DIR="${ROOT_DIR}/runtime/pids"
LOG_DIR="${ROOT_DIR}/runtime/logs"
OFFICE_CHAT_FILE="${ROOT_DIR}/runtime/office_chat.jsonl"
ACTIVITY_FILE="${ROOT_DIR}/runtime/agent_activity.jsonl"

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

append_activity() {
  local stage="$1"
  local content="$2"
  mkdir -p "$(dirname "${ACTIVITY_FILE}")" 2>/dev/null || true
  jq -nc \
    --arg agent "${AGENT_NAME}" \
    --arg stage "${stage}" \
    --arg content "${content}" \
    --arg timestamp "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
    '{agent:$agent,stage:$stage,content:$content,timestamp:$timestamp}' >> "${ACTIVITY_FILE}" 2>/dev/null || true
}

export OPENSWARM_TASK_PAYLOAD="${TASK_PAYLOAD}"

# Wrap the agent so we always emit start/finish lifecycle events the UI can show.
(
  append_activity "started" "Agent started work"
  "${SCRIPT_PATH}" >> "${LOG_DIR}/${AGENT_NAME}.log" 2>&1
  code="$?"
  if [[ "${code}" -eq 0 ]]; then
    append_activity "finished" "Agent finished successfully"
  else
    append_activity "failed" "Agent exited with code ${code}"
  fi
  exit "${code}"
) &
PID=$!
echo "${PID}" > "${PID_DIR}/${AGENT_NAME}.pid"
echo "${PID}"
