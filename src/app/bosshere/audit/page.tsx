import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { Role } from '@prisma/client';
import {
  FileText,
  Clock,
  UserCheck,
  ShieldAlert,
  ArrowRight,
  Search,
  AlertCircle,
  History,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminAuditPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/bosshere/login');
  }
  if (user.role !== Role.ADMIN) {
    redirect('/unauthorized?reason=admin_required');
  }

  const audits = await prisma.attendanceCorrectionAudit.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      changedBy: {
        select: {
          email: true,
          role: true,
          facultyProfile: { select: { name: true, employeeId: true } },
        },
      },
      record: {
        include: {
          student: { select: { rollNumber: true, name: true, department: true } },
          session: {
            include: {
              subject: { select: { code: true, name: true } },
            },
          },
        },
      },
    },
    take: 100,
  });

  return (
    <div className="min-h-screen bg-[#101211] text-[#F1F3ED] flex flex-col">
      <Navbar currentUser={user} />

      <div className="flex-1 flex max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 gap-8">
        <Sidebar role="ADMIN" />

        <main className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#C6F36B]/10 text-[#C6F36B] border border-[#C6F36B]/20">
                  Compliance & Governance
                </span>
              </div>
              <h1 className="text-2xl font-black text-[#F1F3ED] flex items-center gap-2">
                <History className="w-6 h-6 text-[#C6F36B]" />
                Attendance Correction Audit Trail
              </h1>
              <p className="text-xs text-[#A0A89F] mt-1">
                Immutable, timestamped record of every post-session attendance adjustment with actor attribution and mandatory explanation reasons.
              </p>
            </div>
          </div>

          {/* Audit Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="p-4 rounded-xl bg-[#171B18] border border-[#303831]">
              <p className="text-xs font-semibold text-[#A0A89F] uppercase">Total Logged Audits</p>
              <p className="text-2xl font-black text-[#F1F3ED] mt-1">{audits.length}</p>
            </div>
            <div className="p-4 rounded-xl bg-[#171B18] border border-[#303831]">
              <p className="text-xs font-semibold text-[#A0A89F] uppercase">Audit Standard</p>
              <p className="text-sm font-bold text-[#C6F36B] mt-2">Zero Silent Overwrites</p>
              <p className="text-[11px] text-[#A0A89F]">Every delta requires reason & actor identity</p>
            </div>
            <div className="p-4 rounded-xl bg-[#171B18] border border-[#303831]">
              <p className="text-xs font-semibold text-[#A0A89F] uppercase">Retention Policy</p>
              <p className="text-sm font-bold text-[#F1F3ED] mt-2">Permanent Semester Archive</p>
              <p className="text-[11px] text-[#A0A89F]">Available for university academic audits</p>
            </div>
          </div>

          {/* Audit Records Table */}
          <div className="rounded-xl bg-[#171B18] border border-[#303831] overflow-hidden shadow-xl">
            <div className="p-4 border-b border-[#303831] flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#F1F3ED]">Recent Corrections ({audits.length})</h2>
              <span className="text-[11px] text-[#A0A89F]">Displaying latest 100 entries</span>
            </div>

            {audits.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="w-10 h-10 text-[#A0A89F]/40 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-[#F1F3ED]">No attendance corrections recorded</h3>
                <p className="text-xs text-[#A0A89F] mt-1 max-w-sm mx-auto">
                  When faculty or administrators adjust an attendance record with a specified reason, the full audit trail will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#F1F3ED]">
                  <thead className="bg-[#101211]/80 text-[#A0A89F] uppercase text-[10px] font-bold border-b border-[#303831]">
                    <tr>
                      <th className="px-4 py-3">Timestamp (IST)</th>
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3">Subject</th>
                      <th className="px-4 py-3">Transition</th>
                      <th className="px-4 py-3">Modified By</th>
                      <th className="px-4 py-3">Correction Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#303831]/60 font-medium">
                    {audits.map((a) => (
                      <tr key={a.id} className="hover:bg-[#202622]/50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-[#A0A89F] text-[11px] font-mono">
                          {new Date(a.createdAt).toLocaleString('en-IN', {
                            timeZone: 'Asia/Kolkata',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-bold text-[#F1F3ED]">
                            {a.record?.student?.rollNumber || 'Unknown'}
                          </p>
                          <p className="text-[11px] text-[#A0A89F]">
                            {a.record?.student?.name || ''}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-[#C6F36B] font-bold">
                            {a.record?.session?.subject?.code || 'N/A'}
                          </span>
                          <p className="text-[11px] text-[#A0A89F] truncate max-w-[160px]">
                            {a.record?.session?.subject?.name || ''}
                          </p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 font-bold text-[11px]">
                            <span className="px-1.5 py-0.5 rounded bg-[#202622] text-[#A0A89F] border border-[#303831]">
                              {a.originalStatus}
                            </span>
                            <ArrowRight className="w-3 h-3 text-[#A0A89F]" />
                            <span
                              className={`px-1.5 py-0.5 rounded border ${
                                a.newStatus === 'PRESENT'
                                  ? 'bg-[#C6F36B]/15 text-[#C6F36B] border-[#C6F36B]/30'
                                  : a.newStatus === 'LATE'
                                  ? 'bg-[#F0BC65]/15 text-[#F0BC65] border-[#F0BC65]/30'
                                  : 'bg-[#FF7777]/15 text-[#FF7777] border-[#FF7777]/30'
                              }`}
                            >
                              {a.newStatus}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="font-semibold text-[#F1F3ED] text-[11px]">
                            {a.changedBy?.facultyProfile?.name ||
                              (a.changedBy?.role === 'ADMIN' ? 'System Administrator' : 'Faculty')}
                          </p>
                          <p className="text-[10px] text-[#A0A89F] font-mono">
                            {a.changedBy?.email}
                          </p>
                        </td>
                        <td className="px-4 py-3 max-w-[280px]">
                          <p className="text-[#F1F3ED] text-xs italic bg-[#202622] p-2 rounded-lg border border-[#303831]">
                            &ldquo;{a.reason}&rdquo;
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
