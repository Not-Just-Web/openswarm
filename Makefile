SHELL := /bin/bash

.PHONY: build up dashboard swarm logs clean down recover

build:
	docker compose build

up:
	docker compose up -d

dashboard:
	@echo "Open http://localhost:8277"

swarm:
	docker compose exec openswarm /app/agents/main_agent.sh

logs:
	docker compose logs -f openswarm

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

