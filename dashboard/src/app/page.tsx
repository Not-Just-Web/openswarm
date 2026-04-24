"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Activity,
  Box,
  Cpu,
  Database,
  Layers,
  Zap,
  Globe,
  RefreshCw,
  ExternalLink,
  Plus,
  CheckCircle2,
} from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { Terminal } from '@/components/Terminal';
import { CommandCenter } from '@/components/CommandCenter';

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

interface TelemetryData {
  now?: string;
  workspaceRoot: string;
  workspace?: {
    root: string;
    exists: boolean;
    projectCount: number;
    projects: { name: string; path: string; updatedAt?: string }[];
    error?: string;
  };
  docker: DockerSummary;
  heartbeats: Heartbeat[];
  officeChat?: OfficeChatMessage[];
  taskQueue?: QueuedTask[];
  logs: string[];
}

export default function Dashboard() {
  const [data, setData] = useState<TelemetryData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [lastTaskId, setLastTaskId] = useState<string | null>(null);
  const [selectedWorkspacePath, setSelectedWorkspacePath] = useState<string>('');
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [workspaceMessage, setWorkspaceMessage] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string>('main_agent');
  const [agentDetail, setAgentDetail] = useState<null | {
    agent: string;
    pid: string | null;
    status: null | { type: string; content: string; timestamp: string };
    tail: string[];
    logFile: string;
  }>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/status');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json() as TelemetryData;
      setData(json);
      if (!selectedWorkspacePath && (json.workspace?.projects?.length ?? 0) > 0) {
        setSelectedWorkspacePath(json.workspace!.projects[0].path);
      }
      setIsConnected(true);
      setLastUpdated(new Date());
    } catch {
      setIsConnected(false);
    }
  }, [selectedWorkspacePath]);

  useEffect(() => {
    let mounted = true;
    const fetchWrapper = async () => {
      if (mounted) await fetchStatus();
    };
    fetchWrapper();
    intervalRef.current = setInterval(fetchWrapper, 2000);
    return () => {
      mounted = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchStatus]);

  useEffect(() => {
    let cancelled = false;
    const fetchAgent = async () => {
      try {
        const res = await fetch(`/api/agent?name=${encodeURIComponent(selectedAgent)}&lines=120`);
        const json = (await res.json()) as unknown as {
          ok?: boolean;
          agent?: string;
          pid?: string | null;
          status?: null | { type: string; content: string; timestamp: string };
          tail?: unknown;
          logFile?: string;
        };
        if (!cancelled && json?.ok) {
          setAgentDetail({
            agent: json.agent,
            pid: json.pid ?? null,
            status: json.status ?? null,
            tail: Array.isArray(json.tail) ? json.tail : [],
            logFile: json.logFile ?? '',
          });
        }
      } catch {
        // ignore
      }
    };
    fetchAgent();
    const id = setInterval(fetchAgent, 2000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [selectedAgent]);

  const sendCommand = useCallback(async (target: string, command: string, projectPath: string) => {
    try {
      const res = await fetch('/api/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, command, project_path: projectPath }),
      });
      const json = (await res.json().catch(() => null)) as null | { task_id?: string };
      if (json?.task_id) setLastTaskId(json.task_id);
      return { ok: res.ok, task_id: json?.task_id };
    } catch (err) {
      console.error('Command Error:', err);
      return { ok: false as const };
    }
  }, []);

  const createWorkspace = useCallback(async () => {
    const name = newWorkspaceName.trim();
    if (!name) return;
    setIsCreatingWorkspace(true);
    setWorkspaceMessage(null);
    try {
      const res = await fetch('/api/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const json = (await res.json().catch(() => null)) as null | { ok?: boolean; path?: string; name?: string; error?: string };
      if (!res.ok || !json?.ok || !json.path) {
        setWorkspaceMessage(json?.error ?? 'Workspace creation failed.');
        return;
      }
      setSelectedWorkspacePath(json.path);
      setNewWorkspaceName('');
      setWorkspaceMessage(`Workspace ready: ${json.name}`);
      await fetchStatus();
    } catch {
      setWorkspaceMessage('Workspace creation failed.');
    } finally {
      setIsCreatingWorkspace(false);
    }
  }, [fetchStatus, newWorkspaceName]);

  const activeAgents = Array.from(new Set(data?.heartbeats.map(h => h.from) ?? []));
  const containerCount = data?.docker.containers.length ?? 0;
  const healthyContainers = data?.docker.containers.filter(c => c.state === 'running').length ?? 0;
  const workspaceProjectCount = data?.workspace?.projectCount ?? 0;
  const workspaceOptions = (data?.workspace?.projects ?? []).map((project) => ({
    label: project.name,
    value: project.path,
  }));
  const openswarmContainer =
    data?.docker.containers.find(c => c.name.includes('openswarm-supervisor')) ??
    data?.docker.containers.find(c => c.name.includes('openswarm-dashboard')) ??
    data?.docker.containers?.[0];

  return (
    <div className="relative min-h-screen bg-[var(--background)] selection:bg-[color:rgba(176,141,87,0.18)]">
      {/* Background Ambient Glows */}
      <div className="fixed top-0 left-1/4 w-[520px] h-[520px] bg-[color:rgba(176,141,87,0.10)] rounded-full blur-[160px] pointer-events-none -translate-y-1/2" />
      <div className="fixed bottom-0 right-1/4 w-[460px] h-[460px] bg-[color:rgba(214,200,176,0.32)] rounded-full blur-[160px] pointer-events-none translate-y-1/2" />

      <main className="relative z-10 p-6 md:p-12 lg:p-16 max-w-[1600px] mx-auto space-y-12">
        {/* Header */}
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 pb-8 border-b border-stone-200/80">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-white rounded-[2rem] flex items-center justify-center border border-stone-200 shadow-[0_18px_34px_rgba(102,85,54,0.08)]">
              <Layers className="w-8 h-8 text-[color:var(--color-accent)]" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-stone-950 leading-none">OpenSwarm</h1>
                <span className="px-3 py-1 rounded-full bg-stone-900 text-white text-[10px] font-black tracking-[0.2em]">NotJustWeb</span>
              </div>
              <p className="text-stone-500 text-sm font-medium flex items-center gap-2 tracking-wide">
                <Globe className="w-3.5 h-3.5 text-stone-400" />
                Multi-agent command center
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex flex-col items-end gap-1 px-4 border-r border-stone-200/80">
              <span className="text-[10px] text-stone-400 font-black uppercase tracking-widest">Last Telemetry</span>
              <span className="text-xs text-stone-900 font-mono font-bold">
                {lastUpdated ? lastUpdated.toLocaleTimeString() : 'WAITING...'}
              </span>
            </div>

            {lastTaskId && (
              <div className="hidden md:flex flex-col items-end gap-1 px-4 border-r border-stone-200/80">
                <span className="text-[10px] text-stone-400 font-black uppercase tracking-widest">Last Task</span>
                <span className="text-xs text-stone-700 font-mono font-bold">{lastTaskId}</span>
              </div>
            )}
            
            <div className={`px-4 py-2 rounded-2xl text-[10px] font-black flex items-center gap-3 border tracking-[0.15em] transition-all duration-500 ${
              isConnected
                ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                : 'bg-rose-50 border-rose-100 text-rose-700'
            }`}>
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              {isConnected ? 'ONLINE' : 'OFFLINE'}
            </div>

            <button
              onClick={fetchStatus}
              className="p-3 glass rounded-2xl glass-hover text-stone-500 hover:text-stone-900 transition-all active:scale-95"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="OpenSwarm Container"
            value={openswarmContainer ? openswarmContainer.state : '—'}
            icon={Box}
            status={openswarmContainer?.state === 'running' ? 'healthy' : containerCount > 0 ? 'warning' : 'neutral'}
            description={openswarmContainer ? `${openswarmContainer.status} • ${healthyContainers}/${containerCount} running` : 'No container detected'}
          />
          <StatCard
            title="Specialists"
            value={activeAgents.length}
            icon={Activity}
            status={activeAgents.length > 0 ? 'healthy' : 'neutral'}
            description={activeAgents.join(', ') || 'Awaiting heartbeats'}
          />
          <StatCard
            title="Workspace Projects"
            value={workspaceProjectCount}
            icon={Cpu}
            status={workspaceProjectCount > 0 ? 'healthy' : 'neutral'}
            description={data?.workspace?.exists === false ? 'Workspace missing' : (data?.workspace?.error ? 'Workspace error' : (data?.workspace?.root ?? data?.workspaceRoot))}
          />
          <StatCard
            title="Connectivity"
            value={isConnected ? 'OK' : 'Error'}
            icon={Zap}
            status={isConnected ? 'healthy' : 'warning'}
            description="Dashboard telemetry"
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          {/* Main Controls: 8 columns */}
          <div className="xl:col-span-8 space-y-8">
            <CommandCenter
              onSendCommand={sendCommand}
              workspaceRoot={data?.workspaceRoot ?? '/workspace/projects'}
              selectedWorkspacePath={selectedWorkspacePath}
              workspaceOptions={workspaceOptions}
              onWorkspaceChange={setSelectedWorkspacePath}
            />

            {/* Workspace Projects */}
            <div className="glass rounded-[2.5rem] overflow-hidden border-stone-200/80 bg-[var(--panel-strong)]">
              <div className="p-6 border-b border-stone-200/80 bg-stone-50 flex items-center justify-between">
                <h3 className="text-sm font-black text-stone-900 flex items-center gap-3 tracking-[0.12em]">
                  <Box className="w-5 h-5 text-[color:var(--color-accent)]" />
                  Workspace
                </h3>
                <span className="text-[10px] text-stone-500 font-bold uppercase tracking-widest">
                  {data?.workspace?.root ?? data?.workspaceRoot}
                </span>
              </div>
              <div className="p-6 space-y-3">
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={newWorkspaceName}
                      onChange={(e) => setNewWorkspaceName(e.target.value)}
                      placeholder="new workspace name"
                      className="w-full bg-white border border-stone-200 rounded-2xl py-3 px-4 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[rgba(176,141,87,0.18)] focus:border-[rgba(176,141,87,0.35)] transition-all"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={createWorkspace}
                    disabled={!newWorkspaceName.trim() || isCreatingWorkspace}
                    className="px-4 py-3 rounded-2xl border border-stone-200 bg-white text-stone-800 font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40"
                  >
                    <Plus className="w-4 h-4" />
                    {isCreatingWorkspace ? 'Creating…' : 'New Workspace'}
                  </button>
                </div>

                {workspaceMessage && (
                  <div className="text-xs text-stone-700 bg-stone-50 border border-stone-200 rounded-2xl p-4 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    {workspaceMessage}
                  </div>
                )}

                {data?.workspace?.error && (
                  <div className="text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-2xl p-4 font-mono">
                    Workspace error: {data.workspace.error}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(data?.workspace?.projects ?? []).slice(0, 6).map((p) => (
                    <button
                      key={p.path}
                      type="button"
                      onClick={() => setSelectedWorkspacePath(p.path)}
                      className={`p-4 text-left bg-white rounded-2xl border transition-colors ${
                        selectedWorkspacePath === p.path
                          ? 'border-[rgba(176,141,87,0.35)] bg-[rgba(176,141,87,0.08)]'
                          : 'border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <div className="text-sm font-black text-stone-900 tracking-tight">{p.name}</div>
                      <div className="text-[11px] text-stone-500 font-mono mt-1 break-all">{p.path}</div>
                      <div className="flex items-center justify-between gap-2 mt-2">
                        <div className="text-[10px] text-stone-500 font-semibold">
                        {p.updatedAt ? `Updated ${new Date(p.updatedAt).toLocaleString()}` : 'Updated time unknown'}
                        </div>
                        {selectedWorkspacePath === p.path && (
                          <span className="text-[10px] uppercase tracking-widest text-[color:var(--color-accent)] font-black">Active</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
                {(!data?.workspace?.projects || data.workspace.projects.length === 0) && (
                  <div className="text-center py-10">
                    <p className="text-stone-500 text-sm font-medium">No projects found in workspace.</p>
                    <p className="text-stone-500 text-xs font-mono mt-2">
                      Create one with <span className="text-stone-800">make new-project name=my-app</span>
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Live Telemetry Feed */}
            <div className="glass rounded-[2.5rem] overflow-hidden border-stone-200/80 bg-[var(--panel-strong)]">
              <div className="p-6 border-b border-stone-200/80 bg-stone-50 flex items-center justify-between">
                <h3 className="text-sm font-black text-stone-900 flex items-center gap-3 uppercase tracking-[0.2em]">
                  <Activity className="w-5 h-5 text-emerald-600" />
                  Telemetry Stream
                </h3>
                <span className="text-[10px] text-stone-500 font-bold uppercase tracking-widest">Real-time Buffer</span>
              </div>
              <div className="p-6 space-y-4">
                {data?.heartbeats.slice(-6).reverse().map((hb, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-4 bg-white rounded-2xl border border-stone-200 hover:border-stone-300 transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <div>
                        <div className="text-sm font-black text-stone-800 transition-colors">{hb.from}</div>
                        <div className="text-[10px] text-stone-500 font-bold uppercase tracking-widest">{hb.type}</div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="text-xs text-stone-500 font-mono bg-stone-50 px-3 py-1 rounded-lg border border-stone-200 transition-all">{hb.payload}</div>
                      <div className="text-[9px] text-stone-400 font-bold uppercase tracking-tighter">
                        {new Date(hb.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
                {(!data?.heartbeats || data.heartbeats.length === 0) && (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-stone-200">
                      <Activity className="w-6 h-6 text-stone-400" />
                    </div>
                    <p className="text-stone-500 text-sm font-medium italic">No specialist heartbeats detected in registry...</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Side: Terminal (4 columns) */}
          <div className="xl:col-span-4 xl:sticky xl:top-12 space-y-8">
            <div className="h-[520px]">
              <Terminal logs={data?.logs ?? []} />
            </div>

            {/* Office Chat (Manager + Team Discussion) */}
            <div className="glass rounded-[2.5rem] overflow-hidden border-stone-200/80 bg-[var(--panel-strong)]">
              <div className="bg-stone-50 px-6 py-4 flex items-center justify-between border-b border-stone-200/80">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[rgba(176,141,87,0.1)] border border-[rgba(176,141,87,0.18)] flex items-center justify-center">
                    <Activity className="w-4 h-4 text-[color:var(--color-accent)]" />
                  </div>
                  <div>
                    <div className="text-[10px] text-stone-500 font-black uppercase tracking-[0.2em]">Chat Thread</div>
                    <div className="text-xs text-stone-500 font-semibold">Main agent replies, specialist updates, and next actions</div>
                  </div>
                </div>
                <div className="text-[10px] text-stone-500 font-mono bg-white px-3 py-1 rounded-lg border border-stone-200">
                  {(data?.officeChat?.length ?? 0)} msgs
                </div>
              </div>
              <div className="p-5 max-h-[320px] overflow-y-auto space-y-2 bg-[rgba(255,252,247,0.72)]">
                {(data?.officeChat ?? []).slice(-40).map((m, idx) => (
                  <div
                    key={`${m.timestamp}-${idx}`}
                    className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] p-3 rounded-[1.4rem] border ${
                        m.from === 'user'
                          ? 'bg-stone-900 text-white border-stone-900'
                          : m.from === 'main_agent'
                            ? 'bg-white text-stone-900 border-stone-200'
                            : 'bg-[rgba(176,141,87,0.08)] text-stone-900 border-[rgba(176,141,87,0.16)]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className={`text-[10px] font-black tracking-widest uppercase ${
                          m.from === 'user' ? 'text-stone-300' : 'text-stone-500'
                        }`}>
                          {m.from.replace('_', ' ')} • {m.type}
                        </div>
                        <div className={`text-[9px] font-mono ${m.from === 'user' ? 'text-stone-400' : 'text-stone-400'}`}>
                          {new Date(m.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                      <div className={`text-sm mt-1 leading-6 ${m.from === 'user' ? 'text-white' : 'text-stone-800'}`}>
                        {m.content}
                      </div>
                    </div>
                  </div>
                ))}
                {(!data?.officeChat || data.officeChat.length === 0) && (
                  <div className="text-center py-10 text-sm text-stone-500">
                    Start a chat with the <span className="text-stone-900 font-bold">Main Agent</span> and the thread will stay here as the work progresses.
                  </div>
                )}
              </div>
            </div>

            {/* Workstream */}
            <div className="glass rounded-[2.5rem] overflow-hidden border-stone-200/80 bg-[var(--panel-strong)]">
              <div className="bg-stone-50 px-6 py-4 flex items-center justify-between border-b border-stone-200/80">
                <div className="text-[10px] text-stone-500 font-black uppercase tracking-[0.2em]">Workstream</div>
                <div className="text-[10px] text-stone-500 font-mono bg-white px-3 py-1 rounded-lg border border-stone-200">
                  queue {(data?.taskQueue?.length ?? 0)}
                </div>
              </div>
              <div className="p-5 max-h-[260px] overflow-y-auto space-y-2 bg-[rgba(255,252,247,0.72)]">
                {(data?.taskQueue ?? []).slice(-20).reverse().map((t) => (
                  <div key={t.task_id} className="p-3 rounded-2xl border border-stone-200 bg-white">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs font-black text-stone-900 tracking-tight">{t.target}</div>
                      <div className="text-[9px] text-stone-400 font-mono">{new Date(t.queued_at).toLocaleTimeString()}</div>
                    </div>
                    <div className="mt-2 text-[11px] text-stone-500 font-mono break-all">{t.payload}</div>
                  </div>
                ))}
                {(!data?.taskQueue || data.taskQueue.length === 0) && (
                  <div className="text-center py-10 text-sm text-stone-500">
                    No queued tasks yet.
                  </div>
                )}
              </div>
            </div>

            {/* Agent Monitor */}
            <div className="glass rounded-[2.5rem] overflow-hidden border-stone-200/80 bg-[var(--panel-strong)]">
              <div className="bg-stone-50 px-6 py-4 flex items-center justify-between border-b border-stone-200/80">
                <div className="text-[10px] text-stone-500 font-black uppercase tracking-[0.2em]">Agent Monitor</div>
                <div className="text-[10px] text-stone-500 font-mono bg-white px-3 py-1 rounded-lg border border-stone-200">
                  click to inspect
                </div>
              </div>

              <div className="p-5 space-y-4 bg-[rgba(255,252,247,0.72)]">
                <div className="grid grid-cols-2 gap-2">
                  {['main_agent','coder_agent','tester_agent','pm_agent','techlead_agent','designer_agent'].map((a) => (
                    <button
                      key={a}
                      onClick={() => setSelectedAgent(a)}
                      className={`text-left px-4 py-3 rounded-2xl border transition-colors ${
                        selectedAgent === a
                          ? 'bg-stone-900 border-stone-900 text-white'
                          : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-50'
                      }`}
                    >
                      <div className="text-xs font-black tracking-tight">{a}</div>
                      <div className="text-[10px] text-stone-400 font-mono mt-1">
                        {a === selectedAgent && agentDetail?.status
                          ? `${agentDetail.status.type}: ${agentDetail.status.content}`.slice(0, 48)
                          : 'inspect'}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
                  <div className="px-4 py-3 border-b border-stone-200 flex items-center justify-between gap-3">
                    <div className="text-xs font-black text-stone-900">{selectedAgent}</div>
                    <div className="text-[10px] text-stone-400 font-mono">
                      {agentDetail?.pid ? `pid ${agentDetail.pid}` : 'pid unknown'}
                    </div>
                  </div>
                  <div className="p-4 font-mono text-[11px] text-stone-600 leading-relaxed max-h-[220px] overflow-y-auto space-y-1">
                    {(agentDetail?.tail ?? []).slice(-80).map((line, idx) => (
                      <div key={idx} className="break-words">{line}</div>
                    ))}
                    {(!agentDetail || (agentDetail.tail?.length ?? 0) === 0) && (
                      <div className="text-stone-400">No log lines yet.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Infrastructure */}
        <section className="glass rounded-[2.5rem] overflow-hidden border-stone-200/80 bg-[var(--panel-strong)]">
          <div className="p-8 border-b border-stone-200/80 bg-stone-50 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-stone-900 uppercase tracking-[0.3em] flex items-center gap-3">
                <Database className="w-5 h-5 text-[color:var(--color-accent)]" />
                Infrastructure
              </h3>
              <p className="text-[11px] text-stone-500 font-medium mt-1">
                Only the current OpenSwarm stack is shown here
                {data?.docker.composeProject ? ` (${data.docker.composeProject})` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-stone-500 font-bold uppercase tracking-widest">Live Monitoring</span>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-stone-500 border-b border-stone-200/80 bg-stone-50/80">
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest">Service Name</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest">Image</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest">State</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-right">Runtime Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200/80">
                {data?.docker.containers.map((c) => (
                  <tr key={c.id} className="group hover:bg-stone-50/70 transition-all">
                    <td className="p-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${c.state === 'running' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        <span className="font-black text-stone-900 tracking-tight transition-colors">{c.name}</span>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-stone-500 bg-white px-3 py-1 rounded-lg border border-stone-200">{c.image}</span>
                      </div>
                    </td>
                    <td className="p-6">
                      <span className={`px-3 py-1 rounded-lg text-[9px] font-black tracking-widest uppercase border ${
                        c.state === 'running'
                          ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                          : 'bg-rose-50 border-rose-100 text-rose-700'
                      }`}>
                        {c.state}
                      </span>
                    </td>
                    <td className="p-6 text-right">
                      <span className="text-xs text-stone-500 font-mono font-medium">{c.status}</span>
                    </td>
                  </tr>
                ))}
                {(!data?.docker.containers || data.docker.containers.length === 0) && (
                  <tr>
                    <td colSpan={4} className="p-16 text-center">
                      <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-stone-200">
                        <Database className="w-8 h-8 text-stone-500" />
                      </div>
                      <p className="text-stone-500 text-sm font-medium italic">
                        {data?.docker.dockerAvailable === false
                          ? `ERROR: ${data.docker.error}`
                          : 'Infrastructure registry empty...'}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Footer */}
        <footer className="pt-12 flex flex-col md:flex-row items-center justify-between gap-6 border-t border-stone-200/80">
          <div className="flex items-center gap-4 text-[10px] font-black text-stone-500 uppercase tracking-[0.3em]">
            <span>© 2026 OpenSwarm AI</span>
            <div className="w-1 h-1 rounded-full bg-stone-400" />
            <span>NotJustWeb Enterprise</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#" className="text-[10px] font-black text-stone-500 hover:text-stone-900 transition-colors uppercase tracking-widest flex items-center gap-2">
              Documentation <ExternalLink className="w-3 h-3" />
            </a>
            <a href="#" className="text-[10px] font-black text-stone-500 hover:text-stone-900 transition-colors uppercase tracking-widest flex items-center gap-2">
              Memory Vault <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </footer>
      </main>
    </div>
  );
}
