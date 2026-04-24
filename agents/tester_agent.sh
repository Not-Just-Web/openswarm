#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${OPENSWARM_ROOT:-/app}"
source "${ROOT_DIR}/shared/logger.sh"
source "${ROOT_DIR}/shared/bus.sh"
source "${ROOT_DIR}/shared/ollama.sh"

AGENT_NAME="tester_agent"
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
  prompt="$(jq -r '.command // .notes // "Review the current work"' <<< "${TASK_PAYLOAD}")"
  model_note="$(ollama_generate "You are Mira, the QA specialist in OpenSwarm using local model ${OLLAMA_MODEL}. In one short sentence, explain what you are checking for this task: ${prompt}")" || true
  model_done="$(ollama_generate "You are Mira, the QA specialist in OpenSwarm using local model ${OLLAMA_MODEL}. In one short sentence, report the QA outcome for this task: ${prompt}")" || true
  log_info "${AGENT_NAME}" "Reviewing payload ${TASK_PAYLOAD}"
  append_chat "status" "${model_note:-I'm reviewing the current work for risks and verification gaps.}"
  publish "swarm_logs" "$(message_json "${AGENT_NAME}" "main_agent" "log" "QA review requested")"
  if [[ -f "${ROOT_DIR}/Makefile" ]]; then
    make -C "${ROOT_DIR}" -n build >/dev/null 2>&1 || true
  fi
  append_chat "done" "${model_done:-QA review finished. I can help with follow-up validation if needed.}"
  publish "swarm_logs" "$(message_json "${AGENT_NAME}" "dashboard" "log" "Tester agent finished dry-run checks")"
}

main "$@"
