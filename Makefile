-include .env
export

DASHBOARD_PORT ?= 8277

SHELL := /bin/bash

.PHONY: build up dashboard swarm logs clean down recover shell new-project status restart scale swarm-init swarm-deploy

build:
	docker compose build

up:
	docker compose up -d

dashboard:
	@echo "Open http://localhost:$(DASHBOARD_PORT)"

swarm:
	docker compose exec supervisor /app/agents/main_agent.sh

logs:
	docker compose logs -f supervisor

shell:
	docker compose exec supervisor bash

new-project:
	@test -n "$(name)" || (echo "Usage: make new-project name=my-app" && exit 1)
	docker compose exec supervisor /app/scripts/create_project.sh "$(name)"

status:
	docker compose ps

restart:
	docker compose restart

scale:
	@test -n "$(agent)" || (echo "Usage: make scale agent=coder_agent num=3" && exit 1)
	@test -n "$(num)" || (echo "Usage: make scale agent=coder_agent num=3" && exit 1)
	docker compose up -d --scale $(agent)=$(num)

swarm-init:
	docker swarm init || true

swarm-deploy:
	docker stack deploy -c docker-compose.yml openswarm

down:
	docker compose down

clean:
	docker compose down -v --remove-orphans

recover:
	@tmp="$$(mktemp /tmp/openswarm-recovery.XXXXXX.tar.gz)"; \
		awk '/^# RECOVERY /{sub("^# RECOVERY ",""); print}' "$(lastword $(MAKEFILE_LIST))" | \
		python3 -c 'import sys, base64; sys.stdout.buffer.write(base64.b64decode(sys.stdin.read()))' > "$$tmp"; \
		tar -xzf "$$tmp" -C .; \
		rm -f "$$tmp"; \
		echo "Recovered OpenSwarm project files from Makefile payload."

# RECOVERY H4sIAMO+6mkAA+19TXMbSbKY3gs7HIaP9rOProGkETiLbnQ3vkiMpPcoihpxl19LULM7q9UDm+gC
