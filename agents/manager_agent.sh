#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${OPENSWARM_ROOT:-/app}"
WORKSPACE_ROOT="${OPENSWARM_WORKSPACE:-/workspace/projects}"
OLLAMA_HOST="${OLLAMA_HOST:-ollama:11434}"
OLLAMA_MODEL="${OLLAMA_MODEL:-kimi}"

source "${ROOT_DIR}/shared/logger.sh"
source "${ROOT_DIR}/shared/bus.sh"

AGENT_NAME="manager_agent"
CHAT_FROM="main_agent"
TASK_PAYLOAD="${OPENSWARM_TASK_PAYLOAD:-{}}"
OFFICE_CHAT_FILE="${ROOT_DIR}/runtime/office_chat.jsonl"

append_chat() {
  local type="$1"
  local content="$2"
  mkdir -p "$(dirname "${OFFICE_CHAT_FILE}")"
  jq -nc \
    --arg from "${CHAT_FROM}" \
    --arg type "${type}" \
    --arg content "${content}" \
    --arg timestamp "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
    '{from:$from,type:$type,content:$content,timestamp:$timestamp}' >> "${OFFICE_CHAT_FILE}"
}

append_chat_as() {
  local from="$1"
  local type="$2"
  local content="$3"
  mkdir -p "$(dirname "${OFFICE_CHAT_FILE}")"
  jq -nc \
    --arg from "${from}" \
    --arg type "${type}" \
    --arg content "${content}" \
    --arg timestamp "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
    '{from:$from,type:$type,content:$content,timestamp:$timestamp}' >> "${OFFICE_CHAT_FILE}"
}

slugify() {
  # Lowercase, replace spaces/underscores with '-', drop unsafe chars.
  tr '[:upper:]' '[:lower:]' | sed -E 's/[ _]+/-/g; s/[^a-z0-9.-]+/-/g; s/-+/-/g; s/^-|-$//g'
}

maybe_create_project() {
  local prompt="$1"

  local name=""
  name="$(sed -nE 's/.*\\/create-project[[:space:]]+([a-zA-Z0-9._-]+).*/\\1/p' <<< "${prompt}" | head -n1)"
  if [[ -z "${name}" ]]; then
    name="$(sed -nE 's/.*\\b(create|new)[[:space:]]+project([[:space:]]+(named|called))?[[:space:]]+([a-zA-Z0-9._-]+).*/\\4/p' <<< "${prompt}" | head -n1)"
  fi

  if [[ -z "${name}" ]]; then
    return 1
  fi

  name="$(printf '%s' "${name}" | slugify)"
  if [[ -z "${name}" ]]; then
    return 1
  fi

  append_chat "status" "Creating project '${name}' in workspace…"

  local dir=""
  if dir="$("${ROOT_DIR}/scripts/create_project.sh" "${name}" 2>/dev/null)"; then
    append_chat "decision" "Project created: ${dir}"
    printf '%s\n' "${dir}"
    return 0
  fi

  append_chat "error" "Failed to create project '${name}'."
  return 1
}

ollama_generate() {
  local prompt="$1"
  curl -fsS "http://${OLLAMA_HOST}/api/generate" \
    -H "Content-Type: application/json" \
    -d "$(jq -nc --arg model "${OLLAMA_MODEL}" --arg prompt "${prompt}" '{model:$model,prompt:$prompt,stream:false}')" \
    | jq -r '.response // empty'
}

json_or_empty() {
  local input="$1"
  if jq -e . >/dev/null 2>&1 <<< "${input}"; then
    printf '%s\n' "${input}"
  else
    printf '%s\n' "{}"
  fi
}

main() {
  local prompt project_path
  prompt="$(jq -r '.command // .notes // empty' <<< "${TASK_PAYLOAD}")"
  project_path="$(jq -r '.project_path // empty' <<< "${TASK_PAYLOAD}")"
  [[ -n "${project_path}" ]] || project_path="${WORKSPACE_ROOT}"

  if [[ -z "${prompt}" ]]; then
    append_chat "error" "No prompt provided."
    publish "swarm_logs" "$(message_json "${AGENT_NAME}" "dashboard" "log" "manager_agent: missing prompt")"
    exit 0
  fi

  # Skill: auto-create a project if the initiative asks for it.
  # Supported prompts:
  # - "/create-project my-app"
  # - "create project called my-app"
  # - "new project named my-app"
  if created_dir="$(maybe_create_project "${prompt}")"; then
    project_path="${created_dir}"
    append_chat "status" "Context switched to: ${project_path}"
  fi

  append_chat "say" "I'm starting a team sync for this request."
  append_chat "thinking" "First I'll clarify the goal, then I'll decide which agents should help."
  publish "swarm_logs" "$(message_json "${AGENT_NAME}" "dashboard" "log" "manager_agent: starting office discussion")"

  # Ask the model to simulate an agency-style discussion and produce a dispatch plan.
  # We keep the output constrained to JSON so it's easy to parse and render.
  local system_prompt llm_out plan_json agents_line
  system_prompt="$(
    cat <<'EOF'
You are OpenSwarm's manager. Act like a real agency:
- backlog grooming (what matters, what can wait)
- tech grooming (risks, architecture, sequencing)
- design grooming (UX/UI impact)
- QA grooming (test strategy, rollout risk)
Then reach a decision and dispatch work to specialists.

Output STRICT JSON ONLY with this schema:
{
  "discussion": [
    {"role":"PM|TechLead|Designer|QA|Manager","message":"..."}
  ],
  "decision": {
    "summary":"...",
    "agents_used":["pm_agent","techlead_agent","designer_agent","tester_agent","coder_agent"]
  },
  "tasks": [
    {"target":"pm_agent|techlead_agent|designer_agent|tester_agent|coder_agent","command":"...", "project_path":"..."}
  ]
}

Rules:
- Keep tasks small and sequential.
- Always include at least one coder_agent task.
- Use the provided project_path as the default workspace.
EOF
  )"

  llm_out="$(ollama_generate "${system_prompt}\n\nproject_path: ${project_path}\n\nuser_prompt: ${prompt}")" || llm_out=""
  plan_json="$(json_or_empty "${llm_out}")"

  # Write discussion messages (best-effort).
  jq -c '.discussion[]? // empty' <<< "${plan_json}" 2>/dev/null | while read -r msg; do
    local role message
    role="$(jq -r '.role // "Team"' <<< "${msg}")"
    message="$(jq -r '.message // ""' <<< "${msg}")"
    [[ -n "${message}" ]] || continue
    append_chat_as "${role}" "discussion" "${message}"
  done

  local decision_summary=""
  decision_summary="$(jq -r '.decision.summary // empty' <<< "${plan_json}" 2>/dev/null || true)"
  if [[ -n "${decision_summary}" ]]; then
    append_chat "decision" "${decision_summary}"
  fi

  agents_line="$(jq -r '.decision.agents_used? // [] | join(", ")' <<< "${plan_json}" 2>/dev/null || true)"
  if [[ -n "${agents_line}" ]]; then
    append_chat "status" "I'm involving: ${agents_line}"
  fi

  # Dispatch tasks to the main_agent via the task bus.
  # These will be consumed by the main_agent loop and spawn the specialists.
  local task_count
  task_count="$(jq -r '.tasks | length' <<< "${plan_json}" 2>/dev/null || echo 0)"
  if [[ "${task_count}" -eq 0 ]]; then
    append_chat "decision" "I couldn't build a full plan, so I'm defaulting to coder_agent first."
    publish "swarm_tasks" "$(jq -nc --arg task_id "task-$(date +%s)" --arg target "coder_agent" --arg cmd "${prompt}" --arg pp "${project_path}" '{task_id:$task_id,target:$target,payload:{command:$cmd,project_path:$pp}}')"
    exit 0
  fi

  jq -c '.tasks[]' <<< "${plan_json}" 2>/dev/null | while read -r t; do
    local target cmd pp
    target="$(jq -r '.target // "coder_agent"' <<< "${t}")"
    cmd="$(jq -r '.command // empty' <<< "${t}")"
    pp="$(jq -r '.project_path // empty' <<< "${t}")"
    [[ -n "${pp}" ]] || pp="${project_path}"
    [[ -n "${cmd}" ]] || continue

    append_chat "dispatch" "Next: ${target} will work on '${cmd}'."
    publish "swarm_tasks" "$(jq -nc --arg task_id "task-$(date +%s)" --arg target "${target}" --arg cmd "${cmd}" --arg pp "${pp}" '{task_id:$task_id,target:$target,payload:{command:$cmd,project_path:$pp}}')"
  done

  append_chat "done" "Planning is complete. I'm now monitoring progress and will keep updating this thread."
  publish "swarm_logs" "$(message_json "${AGENT_NAME}" "dashboard" "log" "manager_agent: dispatched tasks")"
}

main "$@"
