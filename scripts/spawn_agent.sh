#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${OPENSWARM_ROOT:-/app}"
PID_DIR="${ROOT_DIR}/runtime/pids"
LOG_DIR="${ROOT_DIR}/runtime/logs"
OFFICE_CHAT_FILE="${ROOT_DIR}/runtime/office_chat.jsonl"

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

append_chat() {
  local type="$1"
  local content="$2"
  local chat_from="${AGENT_NAME}"
  # UX: initiatives are "on main agent", but we run them via manager_agent internally.
  if [[ "${AGENT_NAME}" == "manager_agent" ]]; then
    chat_from="main_agent"
  fi
  mkdir -p "$(dirname "${OFFICE_CHAT_FILE}")" 2>/dev/null || true
  jq -nc \
    --arg from "${chat_from}" \
    --arg type "${type}" \
    --arg content "${content}" \
    --arg timestamp "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
    '{from:$from,type:$type,content:$content,timestamp:$timestamp}' >> "${OFFICE_CHAT_FILE}" 2>/dev/null || true
}

export OPENSWARM_TASK_PAYLOAD="${TASK_PAYLOAD}"

# Wrap the agent so we always emit start/finish lifecycle events the UI can show.
(
  append_chat "status" "Started"
  "${SCRIPT_PATH}" >> "${LOG_DIR}/${AGENT_NAME}.log" 2>&1
  code="$?"
  if [[ "${code}" -eq 0 ]]; then
    append_chat "status" "Finished (ok)"
  else
    append_chat "status" "Finished (exit ${code})"
  fi
  exit "${code}"
) &
PID=$!
echo "${PID}" > "${PID_DIR}/${AGENT_NAME}.pid"
echo "${PID}"
