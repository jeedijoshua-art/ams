import React from 'react';
import { Role } from '@prisma/client';
import { Shield, GraduationCap, School } from 'lucide-react';

export function RoleBadge({ role, className = '' }: { role: Role | string; className?: string }) {
  if (role === Role.ADMIN || role === 'ADMIN') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold bg-[#202622] text-[#F0BC65] border border-[#F0BC65]/30 ${className}`}
      >
        <Shield className="w-3 h-3 text-[#F0BC65]" />
        ADMIN
      </span>
    );
  }

  if (role === Role.FACULTY || role === 'FACULTY') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold bg-[#202622] text-[#C6F36B] border border-[#C6F36B]/30 ${className}`}
      >
        <School className="w-3 h-3 text-[#C6F36B]" />
        FACULTY
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold bg-[#202622] text-[#72D6A0] border border-[#72D6A0]/30 ${className}`}
    >
      <GraduationCap className="w-3 h-3 text-[#72D6A0]" />
      STUDENT
    </span>
  );
}
