import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color?: 'teal' | 'amber' | 'emerald' | 'indigo' | 'rose';
  trend?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'teal',
  trend,
}: StatCardProps) {
  const colorStyles = {
    teal: {
      border: 'border-teal-500/20',
      bg: 'bg-teal-500/5',
      iconBg: 'bg-teal-500/15',
      iconText: 'text-teal-400',
    },
    amber: {
      border: 'border-amber-500/20',
      bg: 'bg-amber-500/5',
      iconBg: 'bg-amber-500/15',
      iconText: 'text-amber-400',
    },
    emerald: {
      border: 'border-emerald-500/20',
      bg: 'bg-emerald-500/5',
      iconBg: 'bg-emerald-500/15',
      iconText: 'text-emerald-400',
    },
    indigo: {
      border: 'border-indigo-500/20',
      bg: 'bg-indigo-500/5',
      iconBg: 'bg-indigo-500/15',
      iconText: 'text-indigo-400',
    },
    rose: {
      border: 'border-rose-500/20',
      bg: 'bg-rose-500/5',
      iconBg: 'bg-rose-500/15',
      iconText: 'text-rose-400',
    },
  }[color];

  return (
    <div
      className={`p-5 rounded-2xl bg-slate-900/80 border ${colorStyles.border} shadow-lg backdrop-blur-sm relative overflow-hidden group hover:border-slate-700 transition-all`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-extrabold text-white tracking-tight">{value}</span>
            {trend && <span className="text-xs font-semibold text-emerald-400">{trend}</span>}
          </div>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-xl ${colorStyles.iconBg} ${colorStyles.iconText} shadow-inner`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
