import { useEffect, useRef } from 'react';
import { Terminal as TerminalIcon, Search } from 'lucide-react';

interface TerminalProps {
  logs: string[];
}

export function Terminal({ logs }: TerminalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="glass rounded-[2.5rem] overflow-hidden flex flex-col h-full border-stone-200/80 bg-[var(--panel-strong)]">
      <div className="bg-stone-50 px-6 py-4 flex items-center justify-between border-b border-stone-200/80">
        <div className="flex items-center gap-4">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-300 border border-rose-200" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-300 border border-amber-200" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-300 border border-emerald-200" />
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-lg border border-stone-200">
            <TerminalIcon className="w-3 h-3 text-stone-500" />
            <span className="text-[10px] text-stone-500 font-bold uppercase tracking-widest">swarm.log</span>
          </div>
        </div>
        <Search className="w-4 h-4 text-stone-400" />
      </div>
      
      <div 
        ref={scrollRef}
        className="p-6 overflow-y-auto font-mono text-[11px] leading-relaxed flex-1 space-y-1.5 bg-[rgba(255,252,247,0.9)]"
      >
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full space-y-4 opacity-30">
            <div className="w-8 h-8 rounded-full border-2 border-dashed border-stone-400 animate-spin" />
            <div className="text-stone-500 font-bold uppercase tracking-[0.2em]">Initializing Log Stream</div>
          </div>
        ) : (
          logs.map((log, i) => {
            const isError = log.toLowerCase().includes('error') || log.toLowerCase().includes('failed');
            const isWarn = log.toLowerCase().includes('warn');
            const isInfo = log.toLowerCase().includes('info');
            const isSuccess = log.toLowerCase().includes('success') || log.toLowerCase().includes('done');
            
            let colorClass = 'text-stone-600';
            if (isError) colorClass = 'text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-100 block';
            if (isWarn) colorClass = 'text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 block';
            if (isInfo) colorClass = 'text-stone-700';
            if (isSuccess) colorClass = 'text-emerald-700 font-bold';

            // Extract timestamp if it exists (e.g. 2026-04-24T...)
            const timestampMatch = log.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)\s+/);
            const content = timestampMatch ? log.replace(timestampMatch[1], '').trim() : log;
            const timestamp = timestampMatch ? timestampMatch[1].split('T')[1].replace('Z', '') : null;

            return (
              <div key={i} className={`${colorClass} transition-colors hover:bg-stone-50 px-1 rounded`}>
                {timestamp && (
                  <span className="text-stone-400 font-bold mr-2 opacity-70">[{timestamp}]</span>
                )}
                {content}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
