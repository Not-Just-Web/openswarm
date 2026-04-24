#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${OPENSWARM_ROOT:-/app}"
LOG_FILE="${ROOT_DIR}/runtime/logs/swarm.log"
HEARTBEAT_FILE="${ROOT_DIR}/runtime/heartbeats.jsonl"

touch "${LOG_FILE}" "${HEARTBEAT_FILE}"

echo "== Active agent processes =="
ps -ef | grep "/app/agents/" | grep -v grep || true
echo
echo "== Recent heartbeats =="
tail -n 20 "${HEARTBEAT_FILE}" || true
echo
echo "== Recent swarm log =="
tail -n 50 "${LOG_FILE}" || true
