![OpenSwarm - NotJustWeb](docs/openswarm-banner.svg)

# OpenSwarm

A decoupled, microservices-based multi-agent AI swarm. Orchestrated via Shell, powered by Ollama, and monitored through a live browser dashboard.

## Architecture

```mermaid
graph TD
    User((User)) -->|Port 8277| Dash[Dashboard UI]
    
    subgraph "Swarm Network"
        Dash <-->|Redis Pub/Sub| Bus[(Message Bus)]
        Super[Supervisor Agent] <-->|Tasks| Bus
        Workers[Specialist Agents] <-->|Results| Bus
        
        Super -->|Control| Docker[Docker Socket]
        
        Workers -->|Inference| AI[Ollama Server]
        Super -->|Inference| AI
    end

    subgraph "Persistence"
        AI --- Models[(Ollama Models)]
        Super --- Vault[(Obsidian Vault)]
        Workers --- Projects[(Workspace)]
    end
```

## How It Works

### Task Flow

```mermaid
flowchart LR
    U["User"] --> D["Dashboard UI :8277"]
    D --> A["POST /api/command"]
    A --> R["Redis swarm_tasks"]
    R --> M["supervisor (main_agent.sh)"]
    M --> C["coder_agent.sh"]
    M --> T["tester_agent.sh"]
    M --> P["pm_agent.sh"]
    M --> L["techlead_agent.sh"]
    M --> X["designer_agent.sh"]
    M --> Q["runtime/task_queue.jsonl"]
    C --> S["runtime/logs/*.log"]
    T --> S
    P --> S
    L --> S
    X --> S
    M --> H["runtime/heartbeats.jsonl"]
    S --> D
    H --> D
```

### Monitoring Flow

```mermaid
flowchart TD
    O["Ollama"] --> M["supervisor"]
    M --> HB["Heartbeats"]
    M --> LG["Swarm Logs"]
    M --> AG["Spawned Agents"]
    AG --> ALG["Agent Logs"]
    DS["Docker Socket"] --> UI["Dashboard Server"]
    HB --> UI
    LG --> UI
    ALG --> UI
    UI --> BR["Browser Dashboard"]
```

### Agent Roles

| Agent | Expertise |
| --- | --- |
| `main_agent` | Supervisor, routing, and container orchestration |
| `manager_agent` | Agency-style planning + discussion, then dispatches work to specialists |
| `coder_agent` | Full-stack development and bug fixing |
| `tester_agent` | Quality assurance and verification |
| `pm_agent` | Planning, summaries, and logic framing |
| `techlead_agent` | Technical architecture and review |
| `designer_agent` | UI/UX and product polish |

## Project Layout

```text
.
├── agents/           # Specialist AI shell scripts
├── config/           # Agent and model configurations
├── dashboard/        # Next.js 16 + TypeScript dashboard (port 8277)
├── obsidian_vault/   # Long-term memory and wiki
├── scripts/          # Lifecycle, bootstrap, and entrypoints
├── shared/           # Redis bus and logging utilities
├── Dockerfile        # Agent/Dashboard base image
├── docker-compose.yml# Microservices orchestration
└── Makefile          # Unified command interface
```

## Features

- **Microservices**: Decoupled Redis, Ollama, Dashboard, and Supervisor containers.
- **Next.js Dashboard**: TypeScript + Tailwind CSS UI with hot reload in dev mode.
- **Horizontal Scaling**: Use `make scale agent=coder_agent num=3` for parallel processing.
- **Auto-Respawn**: Built-in healthchecks and `restart: always` logic.
- **Token Optimization**: Integrated **Graphify** for code-graph context reduction.
- **Memory Vault**: LLM-maintained Obsidian wiki for long-term project memory.

## Quick Start

```bash
cp .env.example .env
make build   # builds all Docker images
make up      # starts the full stack
```

Visit **[http://localhost:8277](http://localhost:8277)** — served by the Next.js dashboard.

## Dashboard

The dashboard (`dashboard/`) is a standalone **Next.js 16 + TypeScript** app.

| Mode | Command | Description |
| --- | --- | --- |
| Dev (hot reload) | `make up` | Uses `next dev -p 8277` — edits in `dashboard/src/` reload instantly |
| Production | Change `target: dev` → `target: production` in `docker-compose.yml`, then `make build && make up` | Uses `next build && next start -p 8277` |
| Local (no Docker) | `cd dashboard && npm install && npm run dev` | Runs directly on your machine |

> The dashboard polls `/api/status` every 2 seconds for live telemetry (Docker containers, agent heartbeats, and swarm logs). Commands are dispatched via `POST /api/status` which publishes directly to Redis `swarm_tasks`.

## Manager Chat (Recommended)

OpenSwarm works best when you talk to a single “manager” first.

1. Open the dashboard at `http://localhost:8277`
2. In **Command Center**, choose **Manager**
3. Write a plain initiative prompt (like a real agency brief)
4. Click **Start Sync**

What happens next:

- The **manager_agent** runs a short “agency style” discussion (PM/TechLead/Designer/QA viewpoints).
- It decides a plan, then dispatches small tasks to specialists.
- You monitor progress live in:
  - **Office Chat** (discussion, decisions, dispatch, lifecycle updates)
  - **Workstream** (queued tasks)
  - **Terminal** (swarm.log tail)

### Skill: `/create-project`

If your initiative needs a fresh workspace project, you can ask the Manager to create it for you:

```text
/create-project my-new-app
Build a Next.js app with auth and a minimal dashboard.
```

This will scaffold the folder under `/workspace/projects/my-new-app` and the Manager will route all specialist work into that project path.

## Make Targets

| Command | Action |
| --- | --- |
| `make build` | Build all microservice images |
| `make up` | Start the swarm stack |
| `make status` | Check container health |
| `make scale` | Scale agents (e.g., `agent=coder num=3`) |
| `make logs` | Tail supervisor logs |
| `make swarm-deploy`| Deploy to Docker Swarm cluster |
| `make clean` | Wipe containers and volumes |

## Operations

### Creating New Projects

You can scaffold new projects inside the persistent `/workspace/projects` volume:

```bash
make shell # Enter supervisor
/app/scripts/create_project.sh my-new-app
```

Or from the dashboard: use the Manager prompt with `/create-project my-new-app`.

### Task Examples

Send tasks to agents via the Dashboard or directly via Redis:

```bash
# Example: Ask coder to build a feature
make shell
/app/shared/bus.sh publish swarm_tasks '{"target":"coder_agent","command":"Add dark mode"}'
```

## Memory Vault

Operational memory is stored in `obsidian_vault/`:

- `raw/`: Immutable source material.
- `wiki/`: LLM-maintained architectural notes.
- `index.md`: Content map.
- `log.md`: Chronological overhaul history.

## Repository Notes

- **Git Friendly**: Logs and temporary states are ignored via `.gitignore`.
- **Recovery**: If the repo is lost, `make recover` can restore the scaffold from the Makefile.
- **Port Visibility**:
  - `8277`: Dashboard UI
  - `11434`: Ollama API
  - `6379`: Redis Bus

## Status

Verified locally: Microservices orchestration, Swarm-ready deployment, and horizontal scaling are fully operational.
