import { useState } from 'react';
import { Send, Terminal as TerminalIcon, Folder, Sparkles, Shield, Code2, ClipboardCheck, Kanban, Users } from 'lucide-react';

interface CommandCenterProps {
  onSendCommand: (
    target: string,
    command: string,
    projectPath: string
  ) => Promise<{ ok: boolean; task_id?: string }>;
  workspaceRoot: string;
  selectedWorkspacePath?: string;
  workspaceOptions: { label: string; value: string }[];
  onWorkspaceChange?: (path: string) => void;
}

const AGENTS = [
  { id: 'manager_agent', name: 'Main', icon: Users, color: 'text-violet-700', border: 'border-violet-200', bg: 'bg-violet-50' },
  { id: 'coder_agent', name: 'Coder', icon: Code2, color: 'text-sky-700', border: 'border-sky-200', bg: 'bg-sky-50' },
  { id: 'tester_agent', name: 'Tester', icon: ClipboardCheck, color: 'text-emerald-700', border: 'border-emerald-200', bg: 'bg-emerald-50' },
  { id: 'pm_agent', name: 'PM', icon: Kanban, color: 'text-cyan-700', border: 'border-cyan-200', bg: 'bg-cyan-50' },
  { id: 'techlead_agent', name: 'Tech Lead', icon: Shield, color: 'text-amber-700', border: 'border-amber-200', bg: 'bg-amber-50' },
  { id: 'designer_agent', name: 'Designer', icon: Sparkles, color: 'text-teal-700', border: 'border-teal-200', bg: 'bg-teal-50' },
];

export function CommandCenter({ onSendCommand, workspaceRoot, selectedWorkspacePath, workspaceOptions, onWorkspaceChange }: CommandCenterProps) {
  const [target, setTarget] = useState('manager_agent');
  const [command, setCommand] = useState('');
  const [projectPath, setProjectPath] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [lastSent, setLastSent] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim()) return;
    setIsSending(true);
    setLastError(null);
    const msg = command;
    const result = await onSendCommand(target, msg, projectPath || selectedWorkspacePath || workspaceRoot);
    setIsSending(false);
    if (result.ok) {
      setLastSent(result.task_id ? `sent • ${result.task_id}` : 'sent');
      setCommand('');
    } else {
      setLastError('Failed to dispatch. Check dashboard logs.');
    }
  };

  const selectedAgent = AGENTS.find(a => a.id === target) || AGENTS[0];

  return (
    <div className="glass rounded-[2.25rem] overflow-hidden flex flex-col border-stone-200/80 bg-[var(--panel-strong)]">
      <div className="p-7 border-b border-stone-200/80 bg-stone-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-[1.25rem] bg-[rgba(176,141,87,0.1)] flex items-center justify-center border border-[rgba(176,141,87,0.2)]">
            <TerminalIcon className="w-5 h-5 text-[color:var(--color-accent)]" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-stone-900 tracking-tight">Agent Chat</h2>
            <p className="text-[12px] text-stone-500 font-medium">Talk to the main agent, steer the plan, and follow progress in one thread</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-stone-500 font-mono bg-white px-3 py-1.5 rounded-full border border-stone-200">
            {isSending ? 'sending…' : (lastSent ?? 'ready')}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-8">
        {lastError && (
          <div className="text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-2xl p-4 font-mono">
            {lastError}
          </div>
        )}

        {target !== 'manager_agent' && (
          <div className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-2xl p-4">
            <span className="font-black tracking-widest uppercase text-[10px] block text-amber-700 mb-1">Direct Dispatch Warning</span>
            You’re bypassing the Main Agent’s planning/discussion flow. Recommended for small, well-scoped tasks only.
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Agent Selection */}
          <div className="space-y-4">
            <label className="text-[11px] text-stone-500 font-semibold ml-1 uppercase tracking-[0.18em]">Target agent</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {AGENTS.map((agent) => (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => setTarget(agent.id)}
                  className={`p-3 rounded-2xl flex flex-col items-center gap-2 transition-all border ${
                    target === agent.id 
                      ? `${agent.bg} ${agent.border} ${agent.color} shadow-[0_12px_30px_rgba(176,141,87,0.08)]` 
                      : 'bg-white border-stone-200 text-stone-500 hover:bg-stone-50'
                  }`}
                >
                  <agent.icon className={`w-5 h-5 ${target === agent.id ? agent.color : 'text-stone-400'}`} />
                  <span className="text-xs font-bold tracking-tight">{agent.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Project Context */}
          <div className="space-y-4">
            <label className="text-[11px] text-stone-500 font-semibold ml-1 uppercase tracking-[0.18em]">Workspace</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Folder className="w-5 h-5 text-stone-400 group-focus-within:text-[color:var(--color-accent)] transition-colors" />
              </div>
              <select
                value={projectPath || selectedWorkspacePath || workspaceRoot}
                onChange={(e) => {
                  setProjectPath(e.target.value);
                  onWorkspaceChange?.(e.target.value);
                }}
                className="w-full appearance-none bg-white border border-stone-200 rounded-2xl py-4 pl-12 pr-4 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[rgba(176,141,87,0.18)] focus:border-[rgba(176,141,87,0.35)] transition-all font-mono"
              >
                <option value={workspaceRoot}>Root workspace ({workspaceRoot})</option>
                {workspaceOptions.map((workspace) => (
                  <option key={workspace.value} value={workspace.value}>
                    {workspace.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[10px] text-stone-500 ml-1">
              Selected execution path: {projectPath || selectedWorkspacePath || workspaceRoot}
            </p>
          </div>
        </div>

        {/* Command Input */}
        <div className="space-y-4">
          <div className="flex items-center justify-between ml-1">
            <label className="text-[11px] text-stone-500 font-semibold uppercase tracking-[0.18em]">Instruction</label>
            <span className={`text-[11px] font-semibold ${selectedAgent.color}`}>Routing to {selectedAgent.name}</span>
          </div>
          <div className="relative group">
            <textarea
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder={
                target === 'manager_agent'
                  ? 'Describe the initiative. Tip: use "/create-project my-app" to scaffold a new workspace project, then the Manager will assign specialists...'
                  : `Tell the ${selectedAgent.name.toLowerCase()} what to do...`
              }
              className="w-full bg-[linear-gradient(180deg,#fffcf7_0%,#f9f4eb_100%)] border border-stone-200 rounded-[2rem] p-6 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[rgba(176,141,87,0.18)] focus:border-[rgba(176,141,87,0.35)] transition-all min-h-[180px] resize-none font-medium text-lg leading-relaxed"
            />
            <button
              type="submit"
              disabled={!command.trim()}
              className="absolute bottom-6 right-6 bg-stone-900 hover:bg-stone-800 disabled:opacity-20 disabled:hover:bg-stone-900 text-white px-7 py-3 rounded-2xl flex items-center gap-3 transition-all font-black tracking-widest text-xs shadow-lg shadow-stone-300/40 active:scale-95"
            >
              <span>{target === 'manager_agent' ? 'Start Chat' : 'Dispatch'}</span>
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
