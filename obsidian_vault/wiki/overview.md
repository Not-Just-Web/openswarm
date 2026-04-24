# Overview

OpenSwarm is a shell-driven multi-agent workspace that combines:

- A supervisor agent backed by Ollama `kimi`
- Specialist sub-agents dispatched through Redis pub/sub
- A browser dashboard for steering and telemetry
- A persistent Obsidian-compatible memory vault for structured knowledge

The vault is intended to accumulate operational knowledge, design decisions, and ingestion summaries over time.
