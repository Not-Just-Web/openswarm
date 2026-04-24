const express = require("express");
const http = require("http");
const path = require("path");
const fs = require("fs");
const { execFile } = require("child_process");
const { Server } = require("socket.io");
const Docker = require("dockerode");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const ROOT_DIR = process.env.OPENSWARM_ROOT || "/app";
const WORKSPACE_ROOT = process.env.OPENSWARM_WORKSPACE || "/workspace/projects";
const PORT = Number(process.env.DASHBOARD_PORT || 8277);
const LOG_FILE = path.join(ROOT_DIR, "runtime", "logs", "swarm.log");
const HEARTBEAT_FILE = path.join(ROOT_DIR, "runtime", "heartbeats.jsonl");
const docker = new Docker({ socketPath: "/var/run/docker.sock" });

app.use(express.json());
app.use(express.static(path.join(ROOT_DIR, "dashboard", "public")));

function safeReadLines(filePath, count = 200) {
  try {
    const text = fs.readFileSync(filePath, "utf8");
    return text.trim().split("\n").slice(-count);
  } catch (_error) {
    return [];
  }
}

function parseHeartbeats() {
  return safeReadLines(HEARTBEAT_FILE, 100)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch (_error) {
        return null;
      }
    })
    .filter(Boolean);
}

async function getDockerSummary() {
  try {
    const [containers, info] = await Promise.all([
      docker.listContainers({ all: true }),
      docker.info(),
    ]);
    return {
      dockerAvailable: true,
      containers: containers.map((container) => ({
        id: container.Id.slice(0, 12),
        name: container.Names[0]?.replace(/^\//, "") || "unknown",
        image: container.Image,
        state: container.State,
        status: container.Status,
      })),
      cpuCount: info.NCPU,
      memTotal: info.MemTotal,
    };
  } catch (error) {
    return {
      dockerAvailable: false,
      error: error.message,
      containers: [],
    };
  }
}

app.get("/api/status", async (_req, res) => {
  const dockerSummary = await getDockerSummary();
  res.json({
    now: new Date().toISOString(),
    workspaceRoot: WORKSPACE_ROOT,
    docker: dockerSummary,
    heartbeats: parseHeartbeats(),
    logs: safeReadLines(LOG_FILE, 100),
  });
});

app.post("/api/command", (req, res) => {
  const body = req.body || {};
  const payload = JSON.stringify({
    task_id: body.task_id || `task-${Date.now()}`,
    target: body.target || "coder_agent",
    payload: {
      command: body.command || "",
      notes: body.notes || "",
      project_path: body.project_path || "",
    },
  });

  execFile(path.join(ROOT_DIR, "shared", "bus.sh"), ["publish", "swarm_tasks", payload], (error) => {
    if (error) {
      res.status(500).json({ ok: false, error: error.message });
      return;
    }
    res.json({ ok: true });
  });
});

io.on("connection", async (socket) => {
  socket.emit("snapshot", {
    workspaceRoot: WORKSPACE_ROOT,
    docker: await getDockerSummary(),
    heartbeats: parseHeartbeats(),
    logs: safeReadLines(LOG_FILE, 100),
  });
});

setInterval(async () => {
  io.emit("telemetry", {
    workspaceRoot: WORKSPACE_ROOT,
    docker: await getDockerSummary(),
    heartbeats: parseHeartbeats(),
    logs: safeReadLines(LOG_FILE, 100),
  });
}, 5000);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`OpenSwarm dashboard listening on ${PORT}`);
});
