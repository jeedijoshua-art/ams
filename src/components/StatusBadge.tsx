import React from 'react';
import { AttendanceStatus, SessionStatus } from '@prisma/client';
import { CheckCircle2, AlertCircle, XCircle, Radio, Clock, Ban } from 'lucide-react';

export function AttendanceStatusBadge({
  status,
  className = '',
}: {
  status: AttendanceStatus | string;
  className?: string;
}) {
  switch (status) {
    case AttendanceStatus.PRESENT:
    case 'PRESENT':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 ${className}`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          Present
        </span>
      );
    case AttendanceStatus.LATE:
    case 'LATE':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 ${className}`}
        >
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          Late (Attended)
        </span>
      );
    case AttendanceStatus.ABSENT:
    case 'ABSENT':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30 ${className}`}
        >
          <XCircle className="w-3.5 h-3.5 text-rose-400" />
          Absent
        </span>
      );
  }
}

export function SessionStatusBadge({
  status,
  className = '',
}: {
  status: SessionStatus | string;
  className?: string;
}) {
  switch (status) {
    case SessionStatus.OPEN:
    case 'OPEN':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-500/15 text-teal-400 border border-teal-500/40 animate-pulse ${className}`}
        >
          <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
          Live / Open
        </span>
      );
    case SessionStatus.CLOSED:
    case 'CLOSED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 ${className}`}
        >
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          Concluded
        </span>
      );
    case SessionStatus.CANCELLED:
    case 'CANCELLED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-900/30 text-rose-400 border border-rose-700/40 ${className}`}
        >
          <Ban className="w-3.5 h-3.5 text-rose-400" />
          Cancelled
        </span>
      );
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700 ${className}`}
        >
          {status}
        </span>
      );
  }
}
