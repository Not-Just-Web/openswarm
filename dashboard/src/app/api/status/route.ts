import fs from "fs";
import path from "path";
import Docker from "dockerode";
import { NextResponse } from "next/server";
import { createClient, type RedisClientType } from "redis";

export const dynamic = "force-dynamic";

const ROOT_DIR = process.env.OPENSWARM_ROOT || "/app";
const WORKSPACE_ROOT = process.env.OPENSWARM_WORKSPACE || "/workspace/projects";
const REDIS_HOST = process.env.REDIS_HOST || "redis";
const REDIS_PORT = Number(process.env.REDIS_PORT || "6379");
const LOG_FILE = path.join(ROOT_DIR, "runtime", "logs", "swarm.log");
const HEARTBEAT_FILE = path.join(ROOT_DIR, "runtime", "heartbeats.jsonl");
const OFFICE_CHAT_FILE = path.join(ROOT_DIR, "runtime", "office_chat.jsonl");
const TASK_QUEUE_FILE = path.join(ROOT_DIR, "runtime", "task_queue.jsonl");
const OPENSWARM_SERVICE_NAME = process.env.OPENSWARM_SERVICE_NAME || "openswarm";
const OPENSWARM_COMPOSE_PROJECT = process.env.OPENSWARM_COMPOSE_PROJECT;

interface DockerContainer {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
}

interface DockerSummary {
  dockerAvailable: boolean;
  containers: DockerContainer[];
  composeProject?: string | null;
  cpuCount?: number;
  memTotal?: number;
  error?: string;
}

interface Heartbeat {
  from: string;
  to: string;
  type: string;
  payload: string;
  timestamp: string;
}

interface OfficeChatMessage {
  from: string;
  type: string;
  content: string;
  timestamp: string;
}

interface QueuedTask {
  task_id: string;
  target: string;
  payload: string;
  queued_at: string;
}

interface WorkspaceProject {
  name: string;
  path: string;
  updatedAt?: string;
}

interface WorkspaceSummary {
  root: string;
  exists: boolean;
  projectCount: number;
  projects: WorkspaceProject[];
  error?: string;
}

function safeReadLines(filePath: string, count = 200): string[] {
  try {
    if (!fs.existsSync(filePath)) return [];
    return fs.readFileSync(filePath, "utf8").trim().split("\n").filter(Boolean).slice(-count);
  } catch {
    return [];
  }
}

function appendOfficeChat(from: string, type: string, content: string) {
  try {
    const dir = path.dirname(OFFICE_CHAT_FILE);
    fs.mkdirSync(dir, { recursive: true });
    const line = JSON.stringify({
      from,
      type,
      content,
      timestamp: new Date().toISOString(),
    });
    fs.appendFileSync(OFFICE_CHAT_FILE, `${line}\n`, "utf8");
  } catch {
    // best-effort only
  }
}

let redisClient: RedisClientType | null = null;
async function publishToRedis(channel: string, message: string) {
  if (!redisClient) {
    redisClient = createClient({
      socket: { host: REDIS_HOST, port: REDIS_PORT },
    });
    redisClient.on("error", () => {
      // handled by callers; avoid noisy logs
    });
    await redisClient.connect();
  }
  await redisClient.publish(channel, message);
}

function parseHeartbeats(): Heartbeat[] {
  return safeReadLines(HEARTBEAT_FILE, 100)
    .map((line) => { try { return JSON.parse(line) as Heartbeat; } catch { return null; } })
    .filter((h): h is Heartbeat => h !== null);
}

function parseOfficeChat(): OfficeChatMessage[] {
  return safeReadLines(OFFICE_CHAT_FILE, 120)
    .map((line) => { try { return JSON.parse(line) as OfficeChatMessage; } catch { return null; } })
    .filter((m): m is OfficeChatMessage => m !== null);
}

function parseTaskQueue(): QueuedTask[] {
  return safeReadLines(TASK_QUEUE_FILE, 120)
    .map((line) => { try { return JSON.parse(line) as QueuedTask; } catch { return null; } })
    .filter((t): t is QueuedTask => t !== null);
}

function getWorkspaceSummary(): WorkspaceSummary {
  try {
    const exists = fs.existsSync(WORKSPACE_ROOT);
    if (!exists) {
      return {
        root: WORKSPACE_ROOT,
        exists: false,
        projectCount: 0,
        projects: [],
      };
    }

    const entries = fs.readdirSync(WORKSPACE_ROOT, { withFileTypes: true });
    const projects: WorkspaceProject[] = entries
      .filter((ent) => ent.isDirectory())
      .map((ent) => ent.name)
      .filter((name) => !name.startsWith("."))
      .slice(0, 50)
      .map((name) => {
        const projectPath = path.join(WORKSPACE_ROOT, name);
        try {
          const stat = fs.statSync(projectPath);
          return {
            name,
            path: projectPath,
            updatedAt: stat.mtime.toISOString(),
          };
        } catch {
          return { name, path: projectPath };
        }
      });

    projects.sort((a, b) => {
      const aTime = a.updatedAt ? Date.parse(a.updatedAt) : 0;
      const bTime = b.updatedAt ? Date.parse(b.updatedAt) : 0;
      return bTime - aTime;
    });

    return {
      root: WORKSPACE_ROOT,
      exists: true,
      projectCount: projects.length,
      projects,
    };
  } catch (error) {
    return {
      root: WORKSPACE_ROOT,
      exists: false,
      projectCount: 0,
      projects: [],
      error: error instanceof Error ? error.message : "Unknown workspace error",
    };
  }
}

async function getDockerSummary(): Promise<DockerSummary> {
  try {
    const docker = new Docker({ socketPath: "/var/run/docker.sock" });
    const info = await docker.info();

    // Detect the current compose project so we only show OpenSwarm's containers,
    // not every container running on the host.
    let composeProject: string | null = OPENSWARM_COMPOSE_PROJECT || null;
    if (!composeProject && process.env.HOSTNAME) {
      try {
        const self = await docker.getContainer(process.env.HOSTNAME).inspect();
        const label = self?.Config?.Labels?.["com.docker.compose.project"];
        if (label) composeProject = label;
      } catch {
        // ignore; we'll fall back below
      }
    }

    let containers = [] as Awaited<ReturnType<typeof docker.listContainers>>;
    if (composeProject) {
      containers = await docker.listContainers({
        all: true,
        // dockerode types vary by version; at runtime Docker accepts the standard filters shape.
        filters: { label: [`com.docker.compose.project=${composeProject}`] } as unknown as Record<string, string[]>,
      });
    }

    // Fallbacks: name match for older/non-compose setups.
    if (containers.length === 0) {
      const allContainers = await docker.listContainers({ all: true });
      containers = allContainers.filter((c) => {
        const names = (c.Names ?? []).map((n) => n.replace(/^\//, ""));
        return (
          names.includes(OPENSWARM_SERVICE_NAME) ||
          names.some((n) => n.startsWith("openswarm-")) ||
          names.some((n) => n.includes("openswarm"))
        );
      });
    }

    const mapped = containers.map((c) => ({
      id: c.Id.slice(0, 12),
      name: (c.Names?.[0]?.replace(/^\//, "") ?? OPENSWARM_SERVICE_NAME),
      image: c.Image,
      state: c.State,
      status: c.Status,
    }));

    return {
      dockerAvailable: true,
      containers: mapped,
      composeProject,
      cpuCount: info.NCPU,
      memTotal: info.MemTotal,
    };
  } catch (error) {
    return {
      dockerAvailable: false,
      error: error instanceof Error ? error.message : "Unknown Docker error",
      containers: [],
    };
  }
}

export async function GET() {
  const docker = await getDockerSummary();
  const workspace = getWorkspaceSummary();
  return NextResponse.json({
    now: new Date().toISOString(),
    workspaceRoot: WORKSPACE_ROOT,
    workspace,
    docker,
    heartbeats: parseHeartbeats(),
    officeChat: parseOfficeChat(),
    taskQueue: parseTaskQueue(),
    logs: safeReadLines(LOG_FILE, 100),
  });
}

export async function POST(request: Request) {
  const body = await request.json() as {
    task_id?: string;
    target?: string;
    command?: string;
    notes?: string;
    project_path?: string;
  };

  const taskId = body.task_id || `task-${Date.now()}`;
  const target = body.target || "coder_agent";
  const command = body.command || "";
  const notes = body.notes || "";
  const projectPath = body.project_path || "";

  // Make the UI feel like a chat: record the user prompt immediately.
  if (target === "manager_agent") {
    appendOfficeChat("user", "prompt", command || notes || "(empty)");
    appendOfficeChat("main_agent", "status", "Main agent received the initiative and is starting team sync...");
  } else {
    appendOfficeChat("user", "dispatch", `To ${target}: ${command || notes || "(empty)"}`);
    appendOfficeChat("main_agent", "status", `Direct task queued for ${target}.`);
  }

  const payload = JSON.stringify({
    task_id: taskId,
    target,
    payload: {
      command,
      notes,
      project_path: projectPath,
    },
  });

  try {
    await publishToRedis("swarm_tasks", payload);
    return NextResponse.json({ ok: true, task_id: taskId });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Redis publish failed";
    appendOfficeChat("system", "error", `Dispatch failed: ${msg}`);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
