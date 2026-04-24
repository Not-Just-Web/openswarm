#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${OPENSWARM_ROOT:-/app}"
source "${ROOT_DIR}/shared/logger.sh"
source "${ROOT_DIR}/shared/bus.sh"

AGENT_NAME="techlead_agent"
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
  log_info "${AGENT_NAME}" "Assessing architecture for ${TASK_PAYLOAD}"
  append_chat "status" "I'm reviewing the technical approach and looking for architecture risks."
  append_chat "done" "Tech review finished. Main agent can use this to refine the next step."
  publish "swarm_logs" "$(message_json "${AGENT_NAME}" "main_agent" "log" "Tech lead reviewed architecture")"
}

main "$@"
