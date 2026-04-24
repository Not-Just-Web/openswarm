FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV PATH="/root/go/bin:/usr/local/go/bin:${PATH}"

WORKDIR /app

RUN mkdir -p /workspace/projects

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    git \
    wget \
    make \
    jq \
    python3 \
    python3-pip \
    tmux \
    golang-go \
    redis-tools \
    procps \
    lsb-release \
    gnupg \
    zstd \
    && rm -rf /var/lib/apt/lists/*

RUN pip3 install graphifyy

RUN curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
RUN apt-get update && apt-get install -y --no-install-recommends nodejs && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://ollama.com/install.sh | sh

RUN npm install -g @anthropic-ai/claude-code openclaw opencode-ai@latest @google/gemini-cli

# Copy source (supervisor only — dashboard has its own Dockerfile)
COPY . .

# Fix permissions
RUN chmod +x /app/scripts/*.sh /app/agents/*.sh /app/shared/*.sh

# Entrypoint for supervisor
ENTRYPOINT ["/app/scripts/entrypoint.sh"]
