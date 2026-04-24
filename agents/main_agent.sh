#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${OPENSWARM_ROOT:-/app}"
source "${ROOT_DIR}/shared/logger.sh"
source "${ROOT_DIR}/shared/bus.sh"
source "${ROOT_DIR}/shared/task_queue.sh"

AGENT_NAME="main_agent"
HEARTBEAT_INTERVAL="${HEARTBEAT_INTERVAL:-15}"
HEARTBEAT_FILE="${ROOT_DIR}/runtime/heartbeats.jsonl"

emit_heartbeat() {
  while true; do
    local heartbeat
    heartbeat="$(jq -nc \
      --arg from "${AGENT_NAME}" \
      --arg to "dashboard" \
      --arg type "heartbeat" \
      --arg payload "alive" \
      --arg timestamp "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
      '{from:$from,to:$to,type:$type,payload:$payload,timestamp:$timestamp}')"
    publish "swarm_events" "${heartbeat}"
    echo "${heartbeat}" >> "${HEARTBEAT_FILE}"
    sleep "${HEARTBEAT_INTERVAL}"
  done
}

handle_instruction() {
  local raw="$1"
  local task_id target payload
  task_id="$(jq -r '.task_id // empty' <<< "${raw}")"
  target="$(jq -r '.target // "coder_agent"' <<< "${raw}")"
  payload="$(jq -c '.payload // {}' <<< "${raw}")"

  log_info "${AGENT_NAME}" "Routing task ${task_id:-unknown} to ${target}"
  enqueue_task "${task_id:-task-$(date +%s)}" "${target}" "${payload}"
  publish "swarm_logs" "$(message_json "${AGENT_NAME}" "dashboard" "log" "Dispatched ${target}")"
  "${ROOT_DIR}/scripts/spawn_agent.sh" "${target}" "${payload}" >/dev/null 2>&1 || \
    log_error "${AGENT_NAME}" "Failed to spawn ${target}"
}

handle_rogue_agents() {
  while true; do
    find "${ROOT_DIR}/runtime/pids" -name "*.pid" -type f 2>/dev/null | while read -r pid_file; do
      local agent_name pid
      agent_name="$(basename "${pid_file}" .pid)"
      pid="$(cat "${pid_file}")"
      if ! kill -0 "${pid}" >/dev/null 2>&1; then
        rm -f "${pid_file}"
        log_warn "${AGENT_NAME}" "Cleaned stale PID for ${agent_name}"
      fi
    done
    sleep 10
  done
}

main() {
  mkdir -p "${ROOT_DIR}/runtime/logs" "${ROOT_DIR}/runtime/pids"
  touch "${HEARTBEAT_FILE}"

  emit_heartbeat &
  handle_rogue_agents &

  log_info "${AGENT_NAME}" "Supervisor online; listening on swarm_tasks"

  subscribe "swarm_tasks" | while read -r line; do
    [[ -n "${line}" ]] || continue
    handle_instruction "${line}" || log_error "${AGENT_NAME}" "Failed to process instruction"
  done
}

main "$@"
