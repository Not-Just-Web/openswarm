![OpenSwarm - NotJustWeb](docs/openswarm-banner.svg)

# OpenSwarm

OpenSwarm by NotJustWeb is a Docker-based multi-agent workspace that combines shell-first orchestration, specialist AI workers, a live browser dashboard, Redis messaging, and an Obsidian-style long-term memory vault.

> Build a local AI swarm you can run, steer, monitor, and extend.

## Why OpenSwarm

- Run a supervisor-driven agent swarm inside a single reproducible Docker setup
- Dispatch work across shell-based specialist agents
- Watch logs, heartbeats, and Docker telemetry from one dashboard
- Keep project memory in a structured wiki-style Obsidian vault
- Recover the scaffold from the `Makefile` alone with `make recover`

## What It Includes

- `kimi`-backed supervisor agent running through Ollama
- Specialist shell agents for coding, testing, product, tech lead, and design roles
- Real-time dashboard on port `8277`
- Redis pub/sub message bus for inter-agent coordination
- Persistent Obsidian-compatible knowledge vault for memory and structured notes
- Single-file recovery support through `make recover`

## Architecture

```text
Dashboard (8277)
    -> Redis task channel
    -> main_agent.sh
    -> specialist agents
    -> shared logs + heartbeats
    -> Obsidian memory vault
```

## Highlights

| Area | Included |
| --- | --- |
| Orchestration | Shell-based supervisor + specialist agents |
| Models | Ollama with `kimi` as the minimum supervisor model |
| Transport | Redis pub/sub message bus |
| UI | Express + Socket.IO dashboard on port `8277` |
| Memory | Obsidian-compatible raw/wiki/schema vault layout |
| Recovery | `make recover` restores the scaffold from the `Makefile` |

## Project Layout

```text
.
├── agents/           Shell agents and orchestration roles
├── config/           Agent and model definitions
├── dashboard/        Express + Socket.IO control panel
├── obsidian_vault/   LLM-maintained wiki and raw source memory
├── scripts/          Bootstrap, entrypoint, monitor, and lifecycle helpers
├── shared/           Redis bus, logging, and task queue utilities
├── Dockerfile
├── docker-compose.yml
├── Makefile
└── README.md
```

## Quick Start

```bash
cp .env.example .env
make build
make up
```

Then open [http://localhost:8277](http://localhost:8277).

## Make Targets

- `make build` builds the Docker image
- `make up` starts the OpenSwarm stack
- `make logs` tails container logs
- `make down` stops the stack
- `make clean` removes containers and volumes
- `make recover` restores the scaffold from the embedded payload inside `Makefile`

## Memory Vault

The `obsidian_vault/` folder follows the wiki-maintainer pattern:

- `raw/` stores immutable source material
- `wiki/` stores LLM-maintained pages
- `index.md` is the content map
- `log.md` is the append-only history
- `AGENTS.md` defines the vault workflow and editing rules

## Public Repo Notes

- This repository is designed to be Git-friendly and easy to clone, run, and extend
- Runtime logs, temp state, env files, and local dependency folders are ignored from Git
- The dashboard, agent scripts, Docker setup, and memory vault live together in one repo

## Notes

- The container starts Redis, Ollama, the dashboard, and then the supervisor agent.
- The dashboard reads Docker state through `/var/run/docker.sock`.
- Some tool onboarding commands are best-effort so the stack stays bootable.
- Runtime logs and state are intentionally ignored from Git.

## Status

The scaffold, Docker image build, dashboard boot, and end-to-end task routing have been verified locally in this workspace.
