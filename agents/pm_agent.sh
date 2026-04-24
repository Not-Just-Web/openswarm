#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${OPENSWARM_ROOT:-/app}"
source "${ROOT_DIR}/shared/logger.sh"
source "${ROOT_DIR}/shared/bus.sh"

AGENT_NAME="pm_agent"
TASK_PAYLOAD="${OPENSWARM_TASK_PAYLOAD:-{}}"
OFFICE_CHAT_FILE="${ROOT_DIR}/runtime/office_chat.jsonl"

append_chat() {
  local type="$1"
  local content="$2"
  mkdir -p "$(dirname "${OFFICE_CHAT_FILE}")"
  jq -nc \
    --arg from "${AGENT_NAME}" \
    --arg type "${type}" \
    --arg content "${content}" \
    --arg timestamp "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
    '{from:$from,type:$type,content:$content,timestamp:$timestamp}' >> "${OFFICE_CHAT_FILE}"
}

main() {
  log_info "${AGENT_NAME}" "Summarizing work for payload ${TASK_PAYLOAD}"
  append_chat "status" "I'm translating the request into a practical delivery plan."
  append_chat "done" "PM pass complete. Scope and next steps are clarified."
  publish "swarm_logs" "$(message_json "${AGENT_NAME}" "dashboard" "log" "PM agent captured delivery summary")"
}

main "$@"
