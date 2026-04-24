#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${OPENSWARM_ROOT:-/app}"
source "${ROOT_DIR}/shared/logger.sh"
source "${ROOT_DIR}/shared/bus.sh"
source "${ROOT_DIR}/shared/task_queue.sh"
source "${ROOT_DIR}/shared/ollama.sh"

AGENT_NAME="main_agent"
HEARTBEAT_INTERVAL="${HEARTBEAT_INTERVAL:-15}"
HEARTBEAT_FILE="${ROOT_DIR}/runtime/heartbeats.jsonl"
OFFICE_CHAT_FILE="${ROOT_DIR}/runtime/office_chat.jsonl"
TASK_QUEUE_FILE="${ROOT_DIR}/runtime/task_queue.jsonl"
PID_DIR="${ROOT_DIR}/runtime/pids"

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

agent_human_name() {
  case "$1" in
    manager_agent|main_agent) echo "Aria" ;;
    coder_agent) echo "Dex" ;;
    tester_agent) echo "Mira" ;;
    pm_agent) echo "Nova" ;;
    techlead_agent) echo "Sol" ;;
    designer_agent) echo "Lumi" ;;
    *) echo "$1" ;;
  esac
}

agent_role_name() {
  case "$1" in
    manager_agent|main_agent) echo "Main Agent" ;;
    coder_agent) echo "Coder" ;;
    tester_agent) echo "Tester" ;;
    pm_agent) echo "PM" ;;
    techlead_agent) echo "Tech Lead" ;;
    designer_agent) echo "Designer" ;;
    *) echo "$1" ;;
  esac
}

build_team_status_reply() {
  local active_agents queued_count recent_line recent_summary
  active_agents="$(find "${PID_DIR}" -name "*.pid" -type f 2>/dev/null | sed 's#.*/##' | sed 's#\.pid$##' | while read -r agent; do
    [[ -n "${agent}" ]] || continue
    printf "%s (%s)\n" "$(agent_human_name "${agent}")" "$(agent_role_name "${agent}")"
  done | awk 'BEGIN{ORS=""} {if (NR>1) printf ", "; printf "%s", $0}')"

  queued_count=0
  if [[ -f "${TASK_QUEUE_FILE}" ]]; then
    queued_count="$(grep -c '.' "${TASK_QUEUE_FILE}" 2>/dev/null || echo 0)"
  fi

  recent_line="$(tail -n 12 "${OFFICE_CHAT_FILE}" 2>/dev/null | jq -r 'select(.from != "user") | "\(.from)|\(.content)"' 2>/dev/null | tail -n 1)"
  recent_summary="${recent_line#*|}"

  if [[ -z "${active_agents}" ]]; then
    active_agents="no specialists are actively running yet"
  else
    active_agents="active teammates: ${active_agents}"
  fi

  if [[ -z "${recent_summary}" ]]; then
    recent_summary="No fresh specialist update yet, but I am ready to coordinate the next move."
  fi

  printf "Quick team update: %s. Queue depth is %s. Latest note: %s" "${active_agents}" "${queued_count}" "${recent_summary}"
}

recent_chat_context() {
  if [[ ! -f "${OFFICE_CHAT_FILE}" ]]; then
    return 0
  fi
  tail -n 10 "${OFFICE_CHAT_FILE}" 2>/dev/null \
    | jq -r 'select(.from and .content) | "\(.from) [\(.type)]: \(.content)"' 2>/dev/null \
    | tail -n 8
}

model_route() {
  local target="$1"
  local project_path="$2"
  local command_preview="$3"
  local team_status chat_context prompt response

  team_status="$(build_team_status_reply)"
  chat_context="$(recent_chat_context)"

  prompt=$(cat <<EOF
You are Aria, the main agent for OpenSwarm. You run locally on Ollama using model ${OLLAMA_MODEL}.

Team members:
- Aria = manager_agent = Main Agent
- Dex = coder_agent = Coder
- Mira = tester_agent = Tester / QA
- Nova = pm_agent = PM
- Sol = techlead_agent = Tech Lead
- Lumi = designer_agent = Designer

Current preferred target from UI: ${target}
Current workspace: ${project_path:-/workspace/projects}
Current team status: ${team_status}

Recent conversation:
${chat_context:-No recent messages.}

Latest user message:
${command_preview}

Return STRICT JSON ONLY:
{
  "chat_reply":"short human response as Aria",
  "thinking":"short visible thought for chat, or empty string",
  "action":"reply_only|dispatch",
  "dispatch_target":"manager_agent|coder_agent|tester_agent|pm_agent|techlead_agent|designer_agent",
  "dispatch_command":"command to send if action is dispatch"
}

Rules:
- Be warm, natural, and concise.
- If the user is making small talk or asking for status, use reply_only.
- If the user clearly names Dex, Mira, Nova, Sol, or Lumi, dispatch to that teammate.
- If the request is a broad initiative, dispatch to manager_agent.
- If the UI already selected a specialist target, prefer that target unless the request obviously belongs elsewhere.
- Never leave chat_reply empty.
EOF
)

  response="$(ollama_generate "${prompt}")" || response=""
  ollama_json_or_empty "${response}"
}

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
  local task_id target payload project_path command_preview route_json reply thinking action dispatch_target dispatch_command

  task_id="$(jq -r '.task_id // empty' <<< "${raw}")"
  target="$(jq -r '.target // "coder_agent"' <<< "${raw}")"
  payload="$(jq -c '.payload // {}' <<< "${raw}")"
  project_path="$(jq -r '.project_path // empty' <<< "${payload}")"
  command_preview="$(jq -r '.command // .notes // "task received"' <<< "${payload}")"

  log_info "${AGENT_NAME}" "Routing task ${task_id:-unknown} to ${target}"

  if [[ "${target}" == "main_agent" ]]; then
    target="manager_agent"
  fi

  route_json="$(model_route "${target}" "${project_path}" "${command_preview}")"
  reply="$(jq -r '.chat_reply // empty' <<< "${route_json}")"
  thinking="$(jq -r '.thinking // empty' <<< "${route_json}")"
  action="$(jq -r '.action // "dispatch"' <<< "${route_json}")"
  dispatch_target="$(jq -r '.dispatch_target // empty' <<< "${route_json}")"
  dispatch_command="$(jq -r '.dispatch_command // empty' <<< "${route_json}")"

  [[ -n "${reply}" ]] || reply="I'm here with the team and ready to help."
  append_chat "say" "${reply}"
  [[ -n "${thinking}" ]] && [[ "${thinking}" != "null" ]] && append_chat "thinking" "${thinking}"

  if [[ "${action}" != "dispatch" ]]; then
    return 0
  fi

  if [[ -z "${dispatch_target}" || "${dispatch_target}" == "null" ]]; then
    dispatch_target="${target}"
  fi
  if [[ -z "${dispatch_command}" || "${dispatch_command}" == "null" ]]; then
    dispatch_command="${command_preview}"
  fi

  payload="$(jq -nc --arg command "${dispatch_command}" --arg project_path "${project_path}" '{command:$command,project_path:$project_path}')"

  append_chat "decision" "Task ${task_id:-task}${project_path:+ will run in ${project_path}}."
  append_chat "dispatch" "Next I'm sending this to $(agent_human_name "${dispatch_target}") ($(agent_role_name "${dispatch_target}"))."
  enqueue_task "${task_id:-task-$(date +%s)}" "${dispatch_target}" "${payload}"
  publish "swarm_logs" "$(message_json "${AGENT_NAME}" "dashboard" "log" "Dispatched ${dispatch_target}")"
  "${ROOT_DIR}/scripts/spawn_agent.sh" "${dispatch_target}" "${payload}" >/dev/null 2>&1 || {
    append_chat "error" "Failed to spawn ${dispatch_target}"
    log_error "${AGENT_NAME}" "Failed to spawn ${dispatch_target}"
  }
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
  append_chat "status" "Supervisor online. Ready for initiatives."

  subscribe "swarm_tasks" | while read -r line; do
    [[ -n "${line}" ]] || continue
    handle_instruction "${line}" || log_error "${AGENT_NAME}" "Failed to process instruction"
  done
}

main "$@"
