#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${OPENSWARM_ROOT:-/app}"
QUEUE_FILE="${ROOT_DIR}/runtime/task_queue.jsonl"

enqueue_task() {
  local task_id="$1"
  local target="$2"
  local payload="$3"
  mkdir -p "$(dirname "${QUEUE_FILE}")"
  jq -nc \
    --arg task_id "${task_id}" \
    --arg target "${target}" \
    --arg payload "${payload}" \
    --arg queued_at "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
    '{task_id:$task_id,target:$target,payload:$payload,queued_at:$queued_at}' >> "${QUEUE_FILE}"
}

queue_tail() {
  touch "${QUEUE_FILE}"
  tail -n "${1:-20}" "${QUEUE_FILE}"
}
