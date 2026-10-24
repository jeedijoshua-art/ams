import React from 'react';
import { AlertCircle, CheckCircle, BookOpen, User, Flame } from 'lucide-react';
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
      className={`p-5 rounded-2xl bg-slate-900 border transition-all ${
        isDanger
          ? 'border-rose-500/30 hover:border-rose-500/50'
          : 'border-slate-800 hover:border-slate-700'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-teal-400 border border-slate-700">
            {code}
          </span>
          <h3 className="text-base font-bold text-white mt-1.5">{name}</h3>
          <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
            <User className="w-3 h-3 text-slate-400" />
            {facultyName}
          </p>
        </div>

        {/* Circular or Pill Percentage */}
        <div className="text-right">
          <div
            className={`text-2xl font-black ${
              pct >= 85
                ? 'text-emerald-400'
                : pct >= 75
                ? 'text-teal-400'
                : 'text-rose-400 animate-pulse'
            }`}
          >
            {pct}%
          </div>
          <span
            className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${
              isDanger
                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
            }`}
          >
            {isDanger ? 'Below 75%' : 'Eligible'}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-4">
        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isDanger ? 'bg-rose-500' : 'bg-gradient-to-r from-teal-500 to-emerald-400'
            }`}
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
        <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1.5 font-medium">
          <span>Attended: {stats.classesAttended} / {stats.classesConducted}</span>
          <span>Threshold: {stats.threshold}%</span>
        </div>
      </div>

      {/* Actionable Calculator Advice */}
      {isDanger && (
        <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
          <div>
            <p className="font-semibold text-rose-200">Attendance Shortfall Alert</p>
            <p className="text-[11px] mt-0.5 text-rose-300">
              You must attend the next{' '}
              <span className="font-black text-rose-200 underline">
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
