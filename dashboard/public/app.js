const socket = io();

const dockerMeta = document.getElementById("docker-meta");
const containers = document.getElementById("containers");
const heartbeats = document.getElementById("heartbeats");
const logs = document.getElementById("logs");
const commandForm = document.getElementById("command-form");
const commandStatus = document.getElementById("command-status");
const workspaceRoot = document.getElementById("workspace-root");

function ageLabel(timestamp) {
  const ageMs = Date.now() - new Date(timestamp).getTime();
  const seconds = Math.max(0, Math.round(ageMs / 1000));
  return `${seconds}s ago`;
}

function renderDocker(docker) {
  if (!docker?.dockerAvailable) {
    dockerMeta.textContent = docker?.error || "Docker telemetry unavailable";
    containers.innerHTML = "";
    return;
  }

  dockerMeta.textContent = `CPUs: ${docker.cpuCount} | Memory: ${(docker.memTotal / 1024 / 1024 / 1024).toFixed(1)} GB`;
  containers.innerHTML = docker.containers.map((container) => `
    <div class="card">
      <strong>${container.name}</strong>
      <div>${container.image}</div>
      <div>${container.status}</div>
    </div>
  `).join("");
}

function renderHeartbeats(items) {
  heartbeats.innerHTML = items.slice().reverse().map((item) => {
    const age = Date.now() - new Date(item.timestamp).getTime();
    const stateClass = age < 30000 ? "heartbeat-ok" : "heartbeat-stale";
    return `
      <div class="card">
        <strong>${item.from}</strong>
        <div class="${stateClass}">${ageLabel(item.timestamp)}</div>
      </div>
    `;
  }).join("");
}

function renderLogs(items) {
  logs.textContent = items.join("\n");
}

function renderSnapshot(payload) {
  workspaceRoot.textContent = payload.workspaceRoot ? `Workspace root: ${payload.workspaceRoot}` : "";
  renderDocker(payload.docker);
  renderHeartbeats(payload.heartbeats || []);
  renderLogs(payload.logs || []);
}

socket.on("snapshot", renderSnapshot);
socket.on("telemetry", renderSnapshot);

commandForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const body = {
    target: document.getElementById("target").value,
    command: document.getElementById("command").value.trim(),
    project_path: document.getElementById("project-path").value.trim(),
  };

  const response = await fetch("/api/command", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (response.ok) {
    commandStatus.textContent = "Instruction dispatched to the swarm.";
    document.getElementById("command").value = "";
    document.getElementById("project-path").value = "";
  } else {
    const data = await response.json().catch(() => ({}));
    commandStatus.textContent = data.error || "Failed to dispatch instruction.";
  }
});
