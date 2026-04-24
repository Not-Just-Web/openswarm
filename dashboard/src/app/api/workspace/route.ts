import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const WORKSPACE_ROOT = process.env.OPENSWARM_WORKSPACE || "/workspace/projects";

function slugify(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[ _]+/g, "-")
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { name?: string };
  const rawName = body.name?.trim() ?? "";
  const projectName = slugify(rawName);

  if (!projectName) {
    return NextResponse.json({ ok: false, error: "Project name is required." }, { status: 400 });
  }

  const projectDir = path.join(WORKSPACE_ROOT, projectName);

  try {
    fs.mkdirSync(projectDir, { recursive: true });

    const readmePath = path.join(projectDir, "README.md");
    if (!fs.existsSync(readmePath)) {
      fs.writeFileSync(
        readmePath,
        `# ${projectName}\n\nCreated by OpenSwarm in ${projectDir}.\n\n## Next steps\n\n1. Start a sync from the dashboard.\n2. Select this workspace in Command Center.\n3. Ask the main agent to plan and dispatch the work.\n`,
        "utf8"
      );
    }

    return NextResponse.json({
      ok: true,
      name: projectName,
      path: projectDir,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Workspace creation failed." },
      { status: 500 }
    );
  }
}

