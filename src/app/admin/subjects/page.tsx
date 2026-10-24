'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { Role } from '@prisma/client';
import {
  BookOpen,
  Plus,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Users,
  CalendarCheck,
} from 'lucide-react';

export default function AdminSubjectsPage() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [facultyList, setFacultyList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    facultyId: '',
  });

  const loadData = async () => {
    try {
      const [subjRes, facRes] = await Promise.all([
        fetch('/api/subjects'),
        fetch('/api/faculty'),
      ]);
      const [subjData, facData] = await Promise.all([subjRes.json(), facRes.json()]);

      if (subjData.subjects) setSubjects(subjData.subjects);
      if (facData.faculty) {
        setFacultyList(facData.faculty);
        if (facData.faculty.length > 0 && !formData.facultyId) {
          setFormData((prev) => ({ ...prev, facultyId: facData.faculty[0].id }));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setFeedback({ type: 'success', text: 'Course registered successfully!' });
        setShowModal(false);
        setFormData({
          code: '',
          name: '',
          facultyId: facultyList[0]?.id || '',
        });
        loadData();
      } else {
        setFeedback({ type: 'error', text: data.error || 'Failed to create subject.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Network error.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <div className="flex-1 flex">
        <Sidebar role={Role.ADMIN} />

        <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
                <BookOpen className="w-7 h-7 text-amber-400" />
                Curriculum & Subject Allotment
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Maintain accredited courses and designate authorized faculty instructors.
              </p>
            </div>

            <button
              onClick={() => {
                setShowModal(true);
                setFeedback(null);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-teal-500/20"
            >
              <Plus className="w-4 h-4" />
              Add Course Subject
            </button>
          </div>

          {feedback && (
            <div
              className={`p-4 rounded-xl flex items-center gap-3 border ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              )}
              <span className="text-xs font-medium">{feedback.text}</span>
            </div>
          )}

          <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
            {loading ? (
              <div className="p-12 text-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-teal-400 mb-2" />
                <p className="text-xs">Loading course catalog...</p>
              </div>
            ) : subjects.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <p className="text-sm font-semibold text-slate-300">No subjects cataloged</p>
                <p className="text-xs text-slate-500 mt-1">
                  Add the first course using the button above.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Course Code</th>
                      <th className="py-3 px-4">Subject Title</th>
                      <th className="py-3 px-4">Designated Faculty</th>
                      <th className="py-3 px-4 text-center">Enrolled Students</th>
                      <th className="py-3 px-4 text-center">Conducted Sessions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {subjects.map((sub) => (
                      <tr key={sub.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                          {sub.code}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-white">{sub.name}</td>
                        <td className="py-3.5 px-4 text-slate-300">
                          <div>
                            <span className="font-medium text-white">{sub.faculty?.name}</span>
                            <span className="text-[11px] text-slate-500 block">
                              {sub.faculty?.employeeId} • {sub.faculty?.department}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-teal-400 border border-slate-700">
                            <Users className="w-3 h-3" />
                            {sub._count?.enrollments || 0}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                            <CalendarCheck className="w-3 h-3 text-emerald-400" />
                            {sub._count?.attendanceSessions || 0}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Modal */}
          {showModal && (
            <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
                <h3 className="text-lg font-bold text-white">Create Course Subject</h3>
                <p className="text-xs text-slate-400 mt-1 mb-5">
                  Define a unique course code and assign an accredited instructor.
                </p>

                <form onSubmit={handleCreateSubject} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Course Code
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. CS2045"
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({ ...formData, code: e.target.value.toUpperCase() })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Subject Title
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Cloud Computing & Microservices"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Assigned Faculty Instructor
                    </label>
                    <select
                      value={formData.facultyId}
                      onChange={(e) => setFormData({ ...formData, facultyId: e.target.value })}
                      required
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
                    >
                      {facultyList.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name} ({f.employeeId})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-xs font-bold text-slate-950 flex items-center gap-1.5"
                    >
                      {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Save Course
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
