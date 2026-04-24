#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${OPENSWARM_ROOT:-/app}"
PID_DIR="${ROOT_DIR}/runtime/pids"
AGENT_NAME="${1:-}"

if [[ -z "${AGENT_NAME}" ]]; then
  echo "Usage: $0 <agent_name>" >&2
  exit 1
fi

PID_FILE="${PID_DIR}/${AGENT_NAME}.pid"

if [[ ! -f "${PID_FILE}" ]]; then
  echo "No PID file found for ${AGENT_NAME}" >&2
  exit 1
fi

PID="$(cat "${PID_FILE}")"
if kill "${PID}" >/dev/null 2>&1; then
  rm -f "${PID_FILE}"
  echo "Stopped ${AGENT_NAME} (${PID})"
else
  echo "Failed to stop ${AGENT_NAME} (${PID})" >&2
  exit 1
fi
