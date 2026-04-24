#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${OPENSWARM_ROOT:-/app}"
WORKSPACE_ROOT="${OPENSWARM_WORKSPACE:-/workspace/projects}"
source "${ROOT_DIR}/shared/logger.sh"
source "${ROOT_DIR}/shared/bus.sh"

AGENT_NAME="coder_agent"
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

resolve_target_dir() {
  local requested
  requested="$(jq -r '.project_path // empty' <<< "${TASK_PAYLOAD}")"

  if [[ -n "${requested}" ]]; then
    printf '%s\n' "${requested}"
    return
  fi

  printf '%s\n' "${WORKSPACE_ROOT}"
}

run_opencode() {
  local target_dir prompt
  target_dir="$(resolve_target_dir)"
  prompt="$(jq -r '.command // .notes // "Implement the requested task"' <<< "${TASK_PAYLOAD}")"

  mkdir -p "${target_dir}"
  cd "${target_dir}"

  if command -v opencode >/dev/null 2>&1; then
    opencode "Implement the following task in this workspace: ${prompt}. Full payload: ${TASK_PAYLOAD}" || true
  else
    echo "opencode CLI not available; task payload: ${TASK_PAYLOAD}"
  fi
}

main() {
  local target_dir prompt
  target_dir="$(resolve_target_dir)"
  prompt="$(jq -r '.command // .notes // "Implement the requested task"' <<< "${TASK_PAYLOAD}")"
  log_info "${AGENT_NAME}" "Starting task in ${target_dir}"
  append_chat "status" "I started implementation in ${target_dir}."
  append_chat "thinking" "I'm working on: ${prompt}"
  publish "swarm_logs" "$(message_json "${AGENT_NAME}" "dashboard" "log" "Coder agent started work")"
  run_opencode
  append_chat "done" "Implementation step finished. Main agent can review the outcome or assign follow-up work."
  publish "swarm_logs" "$(message_json "${AGENT_NAME}" "main_agent" "log" "Coder agent completed task")"
}

main "$@"
