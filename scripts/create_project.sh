#!/usr/bin/env bash
set -euo pipefail

WORKSPACE_ROOT="${OPENSWARM_WORKSPACE:-/workspace/projects}"
PROJECT_NAME="${1:-}"

if [[ -z "${PROJECT_NAME}" ]]; then
  echo "Usage: $0 <project-name>" >&2
  exit 1
fi

PROJECT_DIR="${WORKSPACE_ROOT}/${PROJECT_NAME}"
mkdir -p "${PROJECT_DIR}"

if [[ ! -f "${PROJECT_DIR}/README.md" ]]; then
  cat > "${PROJECT_DIR}/README.md" <<EOF
# ${PROJECT_NAME}

Created by OpenSwarm in ${PROJECT_DIR}.

## Next steps

1. Send a task to \`coder_agent\` with \`project_path\` set to this folder.
2. Ask \`tester_agent\` to verify outputs after each implementation step.
3. Store durable notes in the main OpenSwarm memory vault if the project is long-running.
EOF
fi

echo "${PROJECT_DIR}"
