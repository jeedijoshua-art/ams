import React from 'react';
import { AlertCircle, BookOpen, User } from 'lucide-react';
import { AttendanceStats } from '@/lib/attendance';

interface AttendanceCardProps {
  code: string;
  name: string;
  facultyName: string;
  stats: AttendanceStats;
}

export function AttendanceCard({ code, name, facultyName, stats }: AttendanceCardProps) {
  const isDanger = stats.isBelowThreshold;
  const pct = stats.attendancePercentage;

  return (
    <div
      className={`p-5 rounded-xl bg-[#171B18] border transition-all ${
        isDanger
          ? 'border-[#FF7777]/30 hover:border-[#FF7777]/50'
          : 'border-[#303831] hover:border-[#C6F36B]/30'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#202622] text-[#C6F36B] border border-[#303831]">
            {code}
          </span>
          <h3 className="text-base font-bold text-[#F1F3ED] mt-1.5">{name}</h3>
          <p className="text-xs text-[#A0A89F] flex items-center gap-1.5 mt-1">
            <User className="w-3 h-3 text-[#A0A89F]" />
            {facultyName}
          </p>
        </div>

        {/* Circular or Pill Percentage */}
        <div className="text-right">
          <div
            className={`text-2xl font-black ${
              pct >= 85
                ? 'text-[#72D6A0]'
                : pct >= 75
                ? 'text-[#C6F36B]'
                : 'text-[#FF7777] animate-pulse'
            }`}
          >
            {pct}%
          </div>
          <span
            className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${
              stats.classesConducted === 0
                ? 'bg-[#C6F36B]/15 text-[#C6F36B] border border-[#C6F36B]/30'
                : isDanger
                ? 'bg-[#FF7777]/15 text-[#FF7777] border border-[#FF7777]/30'
                : 'bg-[#72D6A0]/15 text-[#72D6A0] border border-[#72D6A0]/30'
            }`}
          >
            {stats.classesConducted === 0
              ? 'New Course (100%)'
              : isDanger
              ? 'Below 75%'
              : 'Eligible'}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-4">
        <div className="w-full h-2 rounded-full bg-[#202622] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isDanger ? 'bg-[#FF7777]' : 'bg-gradient-to-r from-[#C6F36B] to-[#72D6A0]'
            }`}
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
        <div className="flex justify-between items-center text-[11px] text-[#A0A89F] mt-1.5 font-medium">
          <span>
            {stats.classesConducted === 0
              ? '0 attended / 0 eligible classes'
              : `Attended: ${stats.classesAttended} / ${stats.classesConducted}`}
          </span>
          <span>
            {stats.classesConducted === 0 ? 'In Good Standing' : `Threshold: ${stats.threshold}%`}
          </span>
        </div>
      </div>

      {/* Actionable Calculator Advice */}
      {isDanger && (
        <div className="mt-4 p-3 rounded-xl bg-[#FF7777]/10 border border-[#FF7777]/20 text-xs text-[#FF7777] flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-[#FF7777] mt-0.5" />
          <div>
            <p className="font-semibold text-[#F1F3ED]">Attendance Shortfall Alert</p>
            <p className="text-[11px] mt-0.5 text-[#FF7777]">
              You must attend the next{' '}
              <span className="font-black text-[#F1F3ED] underline">
                {stats.classesNeededForThreshold} consecutive session(s)
              </span>{' '}
              without absence to bring this subject back to {stats.threshold}%.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
