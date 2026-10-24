import React from 'react';
import { Role } from '@prisma/client';
import { Shield, GraduationCap, School } from 'lucide-react';

export function RoleBadge({ role, className = '' }: { role: Role | string; className?: string }) {
  if (role === Role.ADMIN || role === 'ADMIN') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 ${className}`}
      >
        <Shield className="w-3 h-3" />
        Administrator
      </span>
    );
  }

  if (role === Role.FACULTY || role === 'FACULTY') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-500/10 text-teal-400 border border-teal-500/30 ${className}`}
      >
        <School className="w-3 h-3" />
        Faculty
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 ${className}`}
    >
      <GraduationCap className="w-3.5 h-3.5" />
      Student
    </span>
  );
}
