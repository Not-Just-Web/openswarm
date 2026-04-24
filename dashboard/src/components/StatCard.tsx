import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  status?: 'healthy' | 'warning' | 'error' | 'neutral';
  description?: string;
}

export function StatCard({ title, value, icon: Icon, status = 'neutral', description }: StatCardProps) {
  const statusColors = {
    healthy: 'text-emerald-700 bg-emerald-50',
    warning: 'text-amber-700 bg-amber-50',
    error: 'text-rose-700 bg-rose-50',
    neutral: 'text-stone-700 bg-stone-100'
  };

  const dotColors = {
    healthy: 'bg-emerald-500',
    warning: 'bg-amber-500',
    error: 'bg-rose-500',
    neutral: 'bg-stone-400'
  };

  return (
    <div className="glass p-6 rounded-[1.75rem] flex flex-col gap-4 transition-all glass-hover group bg-[var(--panel-strong)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-2xl ${statusColors[status]}`}>
            <Icon className="w-5 h-5" />
          </div>
          <span className="text-stone-500 text-[11px] font-bold uppercase tracking-[0.18em]">{title}</span>
        </div>
        <div className={`w-1.5 h-1.5 rounded-full ${dotColors[status]} ${status === 'healthy' ? 'animate-pulse' : ''}`} />
      </div>
      
      <div className="flex flex-col">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold text-stone-900 tracking-tight">{value}</span>
        </div>
        {description && (
          <span className="text-xs text-stone-500 font-medium mt-1 group-hover:text-stone-700 transition-colors">
            {description}
          </span>
        )}
      </div>
    </div>
  );
}
