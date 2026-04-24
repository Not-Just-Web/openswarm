# OpenSwarm Architecture

## Microservices Overview

The project has been decoupled from a monolithic container into a distributed microservices architecture using Docker Compose and Swarm support.

### Services

- **redis**: The message bus for inter-agent communication. Uses the official `redis:7-alpine` image.
- **ollama**: The LLM engine. Uses the official `ollama/ollama` image. Models are persisted in the `ollama-data` volume.
- **dashboard**: Node.js based web interface (Port 8277). Connects to Redis for live streaming.
- **supervisor**: The primary orchestrator. Runs `main_agent.sh` and manages sub-agents.

## High Availability & Scaling

- **Auto-Respawn**: All services are configured with `restart: always`.
- **Healthchecks**: Services use health probes (e.g., `redis-cli ping`, `curl ollama`) to ensure dependencies only start when ready.
- **Scaling**: Agents can be scaled using `make scale agent=<name> num=<n>`.
- **Swarm Support**: The project is ready for cluster deployment via `make swarm-deploy`.

## Resource Management

- **Supervisor Limits**: Capped at 2 CPUs and 4GB RAM to prevent runaway loops.
- **Shared Memory**: All containers share a dedicated `swarm-net` bridge network.
