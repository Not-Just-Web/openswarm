#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${OPENSWARM_ROOT:-/app}"
LOG_FILE="${ROOT_DIR}/runtime/logs/swarm.log"

log_line() {
  local level="$1"
  local actor="$2"
  local message="$3"
  mkdir -p "$(dirname "${LOG_FILE}")"
  printf '%s [%s] (%s) %s\n' "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" "${level}" "${actor}" "${message}" | tee -a "${LOG_FILE}"
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
