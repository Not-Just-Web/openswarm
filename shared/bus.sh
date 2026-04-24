#!/usr/bin/env bash
set -euo pipefail

REDIS_HOST="${REDIS_HOST:-127.0.0.1}"
REDIS_PORT="${REDIS_PORT:-6379}"

publish() {
  local channel="$1"
  local message="$2"
  redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" PUBLISH "${channel}" "${message}" >/dev/null
}

subscribe() {
  local channel="$1"
  redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" --raw SUBSCRIBE "${channel}" | \
    while IFS= read -r kind && IFS= read -r _sub_channel && IFS= read -r payload; do
      if [[ "${kind}" == "message" ]]; then
        printf '%s\n' "${payload}"
      fi
    done
}

message_json() {
  local from="$1"
  local to="$2"
  local type="$3"
  local payload="$4"

  jq -nc \
    --arg from "${from}" \
    --arg to "${to}" \
    --arg type "${type}" \
    --arg payload "${payload}" \
    --arg timestamp "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
    '{from:$from,to:$to,type:$type,payload:$payload,timestamp:$timestamp}'
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  cmd="${1:-}"
  case "${cmd}" in
    publish)
      publish "${2:-}" "${3:-}"
      ;;
    subscribe)
      subscribe "${2:-}"
      ;;
    *)
      echo "Usage: $0 <publish|subscribe> ..." >&2
      exit 1
      ;;
  esac
fi
