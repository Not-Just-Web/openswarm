#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${OPENSWARM_ROOT:-/app}"
WORKSPACE_ROOT="${OPENSWARM_WORKSPACE:-/workspace/projects}"
MODELS_FILE="${ROOT_DIR}/config/ollama_models.yaml"

wait_for_ollama() {
  local host="${OLLAMA_HOST:-127.0.0.1:11434}"
  local retries=30
  until curl -fsS "http://${host}/api/tags" >/dev/null 2>&1; do
    retries=$((retries - 1))
    if [[ "${retries}" -le 0 ]]; then
      echo "Ollama did not become ready in time" >&2
      return 1
    fi
    sleep 2
  done
}

pull_models() {
  if [[ ! -f "${MODELS_FILE}" ]]; then
    ollama pull "${OLLAMA_MODEL:-kimi2.5}"
    return
  fi

  awk '/^- name:/ {print $3}' "${MODELS_FILE}" | while read -r model; do
    [[ -n "${model}" ]] || continue
    echo "Pulling Ollama model: ${model}"
    ollama pull "${model}" || true
  done
}

main() {
  mkdir -p "${ROOT_DIR}/runtime/logs" "${ROOT_DIR}/runtime/pids" "${WORKSPACE_ROOT}"
  wait_for_ollama
  pull_models

  if command -v openclaw >/dev/null 2>&1; then
    openclaw onboard --yes || true
  fi

  if command -v opencode >/dev/null 2>&1; then
    opencode --version >/dev/null 2>&1 || true
  fi
}

main "$@"
