import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ROOT_DIR = process.env.OPENSWARM_ROOT || "/app";
const PID_DIR = path.join(ROOT_DIR, "runtime", "pids");
const LOG_DIR = path.join(ROOT_DIR, "runtime", "logs");
const OFFICE_CHAT_FILE = path.join(ROOT_DIR, "runtime", "office_chat.jsonl");

const KNOWN_AGENTS = [
  "main_agent",
  "coder_agent",
  "tester_agent",
  "pm_agent",
  "techlead_agent",
  "designer_agent",
];

function safeReadLines(filePath: string, count = 200): string[] {
  try {
    if (!fs.existsSync(filePath)) return [];
    return fs.readFileSync(filePath, "utf8").trim().split("\n").filter(Boolean).slice(-count);
  } catch {
    return [];
  }
}

function lastStatusFor(agent: string) {
  const lines = safeReadLines(OFFICE_CHAT_FILE, 400);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    try {
      const obj = JSON.parse(lines[i]) as { from?: string; type?: string; content?: string; timestamp?: string };
      if (obj.from === agent && (obj.type === "status" || obj.type === "decision" || obj.type === "error")) {
        return { type: obj.type ?? "status", content: obj.content ?? "", timestamp: obj.timestamp ?? "" };
      }
    } catch {
      // ignore
    }
  }
  return null;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const name = url.searchParams.get("name") || "";
  const lines = Math.max(10, Math.min(300, Number(url.searchParams.get("lines") || "120")));

  if (!KNOWN_AGENTS.includes(name)) {
    return NextResponse.json(
      { ok: false, error: "Unknown agent. Use one of: " + KNOWN_AGENTS.join(", ") },
      { status: 400 }
    );
  }

  const pidFile = path.join(PID_DIR, `${name}.pid`);
  const logFile = path.join(LOG_DIR, `${name}.log`);

  const pid = fs.existsSync(pidFile) ? (safeReadLines(pidFile, 1)[0] ?? null) : null;
  const tail = safeReadLines(logFile, lines);
  const status = lastStatusFor(name);

  return NextResponse.json({
    ok: true,
    agent: name,
    pid,
    pidFile,
    logFile,
    status,
    tail,
  });
}

