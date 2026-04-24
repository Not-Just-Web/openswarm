#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${OPENSWARM_ROOT:-/app}"
source "${ROOT_DIR}/shared/logger.sh"
source "${ROOT_DIR}/shared/bus.sh"
source "${ROOT_DIR}/shared/ollama.sh"

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
  local prompt model_note model_done
  prompt="$(jq -r '.command // .notes // "Review the technical approach"' <<< "${TASK_PAYLOAD}")"
  model_note="$(ollama_generate "You are Sol, the tech lead in OpenSwarm using local model ${OLLAMA_MODEL}. In one short sentence, describe the technical review you are doing for this task: ${prompt}")" || true
  model_done="$(ollama_generate "You are Sol, the tech lead in OpenSwarm using local model ${OLLAMA_MODEL}. In one short sentence, summarize the technical outcome for this task: ${prompt}")" || true
  log_info "${AGENT_NAME}" "Assessing architecture for ${TASK_PAYLOAD}"
  append_chat "status" "${model_note:-I'm reviewing the technical approach and looking for architecture risks.}"
  append_chat "done" "${model_done:-Tech review finished. Main agent can use this to refine the next step.}"
  publish "swarm_logs" "$(message_json "${AGENT_NAME}" "main_agent" "log" "Tech lead reviewed architecture")"
}

main "$@"
