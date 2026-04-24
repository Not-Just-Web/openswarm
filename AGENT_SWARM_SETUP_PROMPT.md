# 🤖 AGENT SWARM DOCKER PROJECT — SETUP PROMPT (OPTIMIZED)

---

## PROJECT NAME: `OpenSwarm`
**Goal:** A self-contained Docker environment running a multi-agent AI swarm with a supervisor agent orchestrating specialized sub-agents. 
**Requirements:** Kimi 2.5 (Minimum), OpenClaw Codex, OpenCode, Shell-based agents, and a Chrome dashboard on Port 8277.

---

## MASTER SETUP PROMPT (for your agent)

```
You are a senior DevOps and AI infrastructure engineer. Your task is to scaffold a complete Docker-based multi-agent AI swarm project called "OpenSwarm". 

Follow every instruction precisely and produce working, production-ready code.

---

### PHASE 1 — PROJECT STRUCTURE

Create the following directory layout:

openswarm/
├── Dockerfile
├── Makefile
├── docker-compose.yml
├── .env.example
├── README.md
├── scripts/
│   ├── bootstrap.sh          # First-run: pull models, install tools
│   ├── launch.sh             # Start the full swarm
│   ├── kill_agent.sh         # Kill a rogue agent by name
│   ├── spawn_agent.sh        # Spawn a fresh agent instance
│   └── monitor.sh            # Display live agent status dashboard
├── agents/
│   ├── main_agent.sh         # Supervisor / orchestrator (using Kimi 2.5)
│   ├── coder_agent.sh        # Senior full-stack developer (using OpenCode)
│   ├── tester_agent.sh       # Senior QA engineer
│   ├── pm_agent.sh           # Product manager
│   ├── techlead_agent.sh     # Tech lead / architect
│   └── designer_agent.sh     # UI/UX designer
├── dashboard/                # Web interface (Port 8277)
│   ├── server.js             # Express + Socket.io backend
│   ├── public/               # Frontend assets
│   └── package.json
├── shared/
│   ├── bus.sh                # Shell-based messaging wrapper
│   ├── task_queue.sh         # Task management
│   └── logger.sh             # Unified logging
├── config/
│   ├── agents.yaml           # Agent definitions
│   └── ollama_models.yaml    # Models to pull
└── obsidian_vault/           # Agent memory vault
    └── .obsidian/

---

### PHASE 2 — DOCKERFILE

Build a single Dockerfile with the following:

BASE IMAGE: Ubuntu 22.04 LTS

INSTALL:
1. System packages: curl, git, wget, make, jq, python3, pip3, nodejs, npm, tmux, golang-go, redis-tools
2. Ollama: `curl -fsSL https://ollama.com/install.sh | sh`
3. Claude Code: `npm install -g @anthropic-ai/claude-code`
4. OpenClaw CLI: `npm install -g @openclaw/cli`
5. OpenCode CLI: `go install github.com/anomalyco/opencode@latest` (Ensure GOBIN is in PATH)
6. Gemini CLI: `npm install -g @google/gemini-cli`
7. Dashboard dependencies: Install Express, Socket.io, and Dockerode (to talk to Docker socket)

ON STARTUP (ENTRYPOINT):
- Start Ollama service in background
- Run bootstrap.sh to pull Kimi 2.5
- Launch dashboard/server.js on port 8277
- Launch main_agent.sh

---

### PHASE 3 — BOOTSTRAP & MODELS

In bootstrap.sh, pull the following:

```bash
# Models (via Ollama)
ollama pull kimi              # Kimi 2.5 (Minimum Requirement)

# Tool Onboarding (Non-interactive if possible)
openclaw onboard --yes || true
opencode init --yes || true
```

---

### PHASE 4 — AGENT ARCHITECTURE (.sh ONLY)

All agents must be implemented as Shell scripts. They interact with LLMs via CLI tools (ollama, openclaw, opencode).

#### MAIN AGENT (Supervisor)
- File: agents/main_agent.sh
- Model: kimi (Ollama)
- Logic: 
  - Listens to Redis 'swarm_tasks' channel.
  - Parses user input/steering from the Dashboard.
  - Delegates to sub-agents via `agents/spawn_agent.sh`.
  - Monitors heartbeats and kills rogue agents.

#### CODER AGENT
- File: agents/coder_agent.sh
- Tool: opencode (CLI)
- Logic: Receives specs from Main Agent, uses opencode to generate/fix code.

---

### PHASE 5 — CHROME DASHBOARD (PORT 8277)

Build a high-performance, premium web interface in `dashboard/`.

FEATURES:
1. Docker Connectivity: Show container status and resource usage (via docker.sock).
2. Agent Monitoring:
   - Real-time heartbeat indicators (Green/Red).
   - Live log stream from the Main Agent.
3. Steering/Chat:
   - A 'Command Center' text input to send instructions directly to the Main Agent.
   - 'Steer' buttons to override sub-agent decisions.
4. Log Monitor: A centralized scrollable terminal view for all inter-agent communication.

TECH STACK:
- Backend: Node.js + Express + Socket.io.
- Frontend: Vanilla JS + CSS (Rich aesthetics, dark mode, glassmorphism).

---

### PHASE 6 — INTER-AGENT COMMUNICATION

Use Redis as the message bus. Provide a `shared/bus.sh` script that agents use to:
- `publish(channel, message)`
- `subscribe(channel)`

Message Schema (JSON):
```json
{
  "from": "agent_name",
  "to": "target",
  "type": "instruction | log | heartbeat",
  "payload": "...",
  "timestamp": "..."
}
```

---

### PHASE 7 — MAKEFILE TARGETS

```makefile
build:    # docker-compose build
up:       # docker-compose up -d
dashboard:# Open http://localhost:8277 in chrome
swarm:    # Trigger main_agent.sh start
logs:     # Tail logs
clean:    # Wipe everything
```

---

### DELIVERABLES

Produce ALL files listed in PHASE 1. Ensure `agents/*.sh` are executable.
Focus on the Dashboard on port 8277 and the Kimi 2.5 integration.
```
