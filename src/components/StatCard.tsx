import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color?: 'lime' | 'teal' | 'amber' | 'emerald' | 'indigo' | 'rose' | 'warning' | 'success' | 'error' | 'info';
  trend?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'lime',
  trend,
}: StatCardProps) {
  const colorStyles = {
    lime: {
      border: 'border-[#303831]',
      hoverBorder: 'hover:border-[#C6F36B]/40',
      iconBg: 'bg-[#C6F36B]/10',
      iconText: 'text-[#C6F36B]',
    },
    teal: {
      border: 'border-[#303831]',
      hoverBorder: 'hover:border-[#C6F36B]/40',
      iconBg: 'bg-[#C6F36B]/10',
      iconText: 'text-[#C6F36B]',
    },
    amber: {
      border: 'border-[#303831]',
      hoverBorder: 'hover:border-[#F0BC65]/40',
      iconBg: 'bg-[#F0BC65]/10',
      iconText: 'text-[#F0BC65]',
    },
    warning: {
      border: 'border-[#303831]',
      hoverBorder: 'hover:border-[#F0BC65]/40',
      iconBg: 'bg-[#F0BC65]/10',
      iconText: 'text-[#F0BC65]',
    },
    emerald: {
      border: 'border-[#303831]',
      hoverBorder: 'hover:border-[#72D6A0]/40',
      iconBg: 'bg-[#72D6A0]/10',
      iconText: 'text-[#72D6A0]',
    },
    success: {
      border: 'border-[#303831]',
      hoverBorder: 'hover:border-[#72D6A0]/40',
      iconBg: 'bg-[#72D6A0]/10',
      iconText: 'text-[#72D6A0]',
    },
    indigo: {
      border: 'border-[#303831]',
      hoverBorder: 'hover:border-[#83B8FF]/40',
      iconBg: 'bg-[#83B8FF]/10',
      iconText: 'text-[#83B8FF]',
    },
    info: {
      border: 'border-[#303831]',
      hoverBorder: 'hover:border-[#83B8FF]/40',
      iconBg: 'bg-[#83B8FF]/10',
      iconText: 'text-[#83B8FF]',
    },
    rose: {
      border: 'border-[#303831]',
      hoverBorder: 'hover:border-[#FF7777]/40',
      iconBg: 'bg-[#FF7777]/10',
      iconText: 'text-[#FF7777]',
    },
    error: {
      border: 'border-[#303831]',
      hoverBorder: 'hover:border-[#FF7777]/40',
      iconBg: 'bg-[#FF7777]/10',
      iconText: 'text-[#FF7777]',
    },
  }[color] || {
    border: 'border-[#303831]',
    hoverBorder: 'hover:border-[#C6F36B]/40',
    iconBg: 'bg-[#C6F36B]/10',
    iconText: 'text-[#C6F36B]',
  };

  return (
    <div
      className={`p-5 rounded-xl bg-[#171B18] border ${colorStyles.border} ${colorStyles.hoverBorder} shadow-sm transition-all`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#A0A89F]">{title}</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-[#F1F3ED] tracking-tight">{value}</span>
            {trend && <span className="text-xs font-semibold text-[#72D6A0]">{trend}</span>}
          </div>
          {subtitle && <p className="text-xs text-[#A0A89F] mt-1">{subtitle}</p>}
        </div>
        <div className={`p-2.5 rounded-lg ${colorStyles.iconBg} ${colorStyles.iconText}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
