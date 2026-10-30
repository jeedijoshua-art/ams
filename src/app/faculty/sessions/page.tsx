'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { Role } from '@prisma/client';
import { SessionStatusBadge } from '@/components/StatusBadge';
import { CalendarCheck, QrCode, Plus, Loader2, ArrowRight, Filter, Search } from 'lucide-react';

export default function FacultySessionsListPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const loadSessions = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedSubject) params.set('subjectId', selectedSubject);
      if (selectedStatus) params.set('status', selectedStatus);

      const res = await fetch(`/api/sessions?${params.toString()}`);
      const data = await res.json();
      if (data.sessions) setSessions(data.sessions);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch('/api/subjects')
      .then((res) => res.json())
      .then((data) => {
        if (data.subjects) setSubjects(data.subjects);
      });
  }, []);

  useEffect(() => {
    loadSessions();
  }, [selectedSubject, selectedStatus]);

  return (
    <div className="min-h-screen bg-[#101211] text-[#F1F3ED] flex flex-col">
      <Navbar />

      <div className="flex-1 flex max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 gap-8">
        <Sidebar role={Role.FACULTY} />

        <main className="flex-1 min-w-0 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-[#F1F3ED] flex items-center gap-2.5">
                <CalendarCheck className="w-6 h-6 text-[#C6F36B]" />
                Attendance Sessions Registry
              </h1>
              <p className="text-xs text-[#A0A89F] mt-1">
                Historical and active attendance sessions for your assigned courses.
              </p>
            </div>

            <Link
              href="/faculty/sessions/new"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#C6F36B] hover:bg-[#D4FF83] active:bg-[#b5e855] text-[#101211] text-xs font-bold transition-all shadow-lg shadow-[#C6F36B]/20"
            >
              <Plus className="w-4 h-4" />
              New QR Session
            </Link>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-[#171B18] border border-[#303831]">
            <div className="flex items-center gap-2 text-xs text-[#A0A89F]">
              <Filter className="w-4 h-4" />
              <span className="font-semibold text-[#F1F3ED]">Filter By:</span>
            </div>

            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-[#202622] border border-[#303831] text-xs text-[#F1F3ED] focus:outline-none focus:border-[#C6F36B]"
            >
              <option value="">All Assigned Courses</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} — {s.name}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-[#202622] border border-[#303831] text-xs text-[#F1F3ED] focus:outline-none focus:border-[#C6F36B]"
            >
              <option value="">All Session Statuses</option>
              <option value="OPEN">Live / Open</option>
              <option value="CLOSED">Concluded / Closed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div className="rounded-xl bg-[#171B18] border border-[#303831] overflow-hidden shadow-xl">
            {loading ? (
              <div className="p-12 text-center text-[#A0A89F]">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#C6F36B] mb-2" />
                <p className="text-xs">Loading sessions log...</p>
              </div>
            ) : sessions.length === 0 ? (
              <div className="p-12 text-center text-[#A0A89F]">
                <p className="text-sm font-semibold text-[#F1F3ED]">No sessions match your filter</p>
                <Link
                  href="/faculty/sessions/new"
                  className="text-xs text-[#C6F36B] underline mt-1 inline-block"
                >
                  Create a new session
                </Link>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-[#202622] text-[#A0A89F] uppercase tracking-wider font-semibold border-b border-[#303831]">
                  <tr>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Session Date & Time</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">Marked Attendance</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#303831] text-[#A0A89F]">
                  {sessions.map((s) => (
                    <tr key={s.id} className="hover:bg-[#202622]/40 transition-colors">
                      <td className="py-3.5 px-4 font-medium">
                        <span className="font-mono text-[#C6F36B] mr-2">{s.subject.code}</span>
                        <span className="text-[#F1F3ED]">{s.subject.name}</span>
                      </td>
                      <td className="py-3.5 px-4 text-[#A0A89F]">
                        {new Date(s.startsAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3.5 px-4">
                        <SessionStatusBadge status={s.status} />
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-[#F1F3ED]">
                        {s._count.records} Attendees
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/faculty/sessions/${s.id}`}
                          className="px-3 py-1.5 rounded-lg bg-[#202622] hover:bg-[#252D27] border border-[#303831] hover:border-[#424D43] text-[#C6F36B] font-semibold text-xs inline-flex items-center gap-1 transition-all"
                        >
                          Roster & Audit <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
