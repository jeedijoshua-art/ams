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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <div className="flex-1 flex max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 gap-8">
        <Sidebar role={Role.FACULTY} />

        <main className="flex-1 min-w-0 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
                <CalendarCheck className="w-6 h-6 text-teal-400" />
                Attendance Sessions Registry
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Historical and active attendance sessions for your assigned courses.
              </p>
            </div>

            <Link
              href="/faculty/sessions/new"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-teal-500/20"
            >
              <Plus className="w-4 h-4" />
              New QR Session
            </Link>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Filter className="w-4 h-4" />
              <span className="font-semibold text-slate-300">Filter By:</span>
            </div>

            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
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
              className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
            >
              <option value="">All Session Statuses</option>
              <option value="OPEN">Live / Open</option>
              <option value="CLOSED">Concluded / Closed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
            {loading ? (
              <div className="p-12 text-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-teal-400 mb-2" />
                <p className="text-xs">Loading sessions log...</p>
              </div>
            ) : sessions.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <p className="text-sm font-semibold text-slate-300">No sessions match your filter</p>
                <Link
                  href="/faculty/sessions/new"
                  className="text-xs text-teal-400 underline mt-1 inline-block"
                >
                  Create a new session
                </Link>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Session Date & Time</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">Marked Attendance</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {sessions.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-800/40">
                      <td className="py-3.5 px-4 font-medium">
                        <span className="font-mono text-teal-400 mr-2">{s.subject.code}</span>
                        <span className="text-white">{s.subject.name}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
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
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-white">
                        {s._count.records} Attendees
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/faculty/sessions/${s.id}`}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 font-semibold text-xs inline-flex items-center gap-1"
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
