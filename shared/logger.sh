#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${OPENSWARM_ROOT:-/app}"
LOG_FILE="${ROOT_DIR}/runtime/logs/swarm.log"
AUDIT_FILE="${ROOT_DIR}/runtime/logs/audit.jsonl"

log_line() {
  local level="$1"
  local actor="$2"
  local message="$3"
  mkdir -p "$(dirname "${LOG_FILE}")"
  local ts="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  
  # Standard log
  printf '%s [%s] (%s) %s\n' "${ts}" "${level}" "${actor}" "${message}" | tee -a "${LOG_FILE}"
  
  # Audit JSON log
  jq -n --arg ts "${ts}" --arg lvl "${level}" --arg act "${actor}" --arg msg "${message}" \
    '{timestamp: $ts, level: $lvl, agent: $act, message: $msg}' >> "${AUDIT_FILE}"
}

log_info() {
  log_line "INFO" "$1" "$2"
}

log_warn() {
  log_line "WARN" "$1" "$2"
}

log_error() {
  log_line "ERROR" "$1" "$2"
}
