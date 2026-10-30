import React from 'react';
import { AttendanceStatus, SessionStatus } from '@prisma/client';
import { CheckCircle2, Clock, XCircle, Ban } from 'lucide-react';

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
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold bg-[#202622] text-[#72D6A0] border border-[#72D6A0]/30 ${className}`}
        >
          <CheckCircle2 className="w-3 h-3 text-[#72D6A0]" />
          PRESENT
        </span>
      );
    case AttendanceStatus.LATE:
    case 'LATE':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold bg-[#202622] text-[#F0BC65] border border-[#F0BC65]/30 ${className}`}
        >
          <Clock className="w-3 h-3 text-[#F0BC65]" />
          LATE
        </span>
      );
    case AttendanceStatus.ABSENT:
    case 'ABSENT':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold bg-[#202622] text-[#FF7777] border border-[#FF7777]/30 ${className}`}
        >
          <XCircle className="w-3 h-3 text-[#FF7777]" />
          ABSENT
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
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold bg-[#202622] text-[#C6F36B] border border-[#C6F36B]/40 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#C6F36B] animate-ping" />
          ACTIVE // OPEN
        </span>
      );
    case SessionStatus.CLOSED:
    case 'CLOSED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-medium bg-[#171B18] text-[#A0A89F] border border-[#303831] ${className}`}
        >
          <Clock className="w-3 h-3 text-[#A0A89F]" />
          CONCLUDED
        </span>
      );
    case SessionStatus.CANCELLED:
    case 'CANCELLED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold bg-[#202622] text-[#FF7777] border border-[#FF7777]/30 ${className}`}
        >
          <Ban className="w-3 h-3 text-[#FF7777]" />
          CANCELLED
        </span>
      );
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[10px] bg-[#171B18] text-[#A0A89F] border border-[#303831] ${className}`}
        >
          {status}
        </span>
      );
  }
}
