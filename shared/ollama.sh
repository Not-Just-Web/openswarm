#!/usr/bin/env bash
set -euo pipefail

OLLAMA_HOST="${OLLAMA_HOST:-ollama:11434}"
OLLAMA_MODEL="${OLLAMA_MODEL:-kimi2.5}"

ollama_generate() {
  local prompt="$1"
  curl -fsS "http://${OLLAMA_HOST}/api/generate" \
    -H "Content-Type: application/json" \
    -d "$(jq -nc --arg model "${OLLAMA_MODEL}" --arg prompt "${prompt}" '{model:$model,prompt:$prompt,stream:false}')" \
    | jq -r '.response // empty'
}

ollama_json_or_empty() {
  local input="$1"
  if jq -e . >/dev/null 2>&1 <<< "${input}"; then
    printf '%s\n' "${input}"
  else
    printf '%s\n' "{}"
  fi
}
