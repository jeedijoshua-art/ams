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
  RefreshCw,
  X,
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
    setLoading(true);
    setFeedback(null);
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
    } catch (err: any) {
      console.error('Failed to load courses:', err);
      setFeedback({ type: 'error', text: err.message || 'Network error while loading courses.' });
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
    <div className="min-h-screen bg-[#101211] text-[#F1F3ED] flex flex-col">
      <Navbar />

      <div className="flex-1 flex max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 gap-8">
        <Sidebar role={Role.ADMIN} />

        <main className="flex-1 min-w-0 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#F1F3ED] tracking-tight flex items-center gap-2.5">
                <BookOpen className="w-7 h-7 text-[#C6F36B]" />
                Curriculum & Subject Allotment
              </h1>
              <p className="text-xs sm:text-sm text-[#A0A89F] mt-1">
                Maintain accredited courses and designate authorized faculty instructors.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={loadData}
                disabled={loading}
                className="p-2.5 rounded-xl bg-[#171B18] border border-[#303831] hover:border-[#C6F36B]/40 text-[#A0A89F] hover:text-[#F1F3ED] transition-all"
                title="Refresh course list"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#C6F36B]' : ''}`} />
              </button>
              <button
                onClick={() => {
                  setShowModal(true);
                  setFeedback(null);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#C6F36B] hover:bg-[#b5e855] text-[#101211] text-xs font-bold transition-all shadow-lg shadow-[#C6F36B]/20"
              >
                <Plus className="w-4 h-4" />
                Add Course Subject
              </button>
            </div>
          </div>

          {feedback && (
            <div
              className={`p-4 rounded-xl flex items-center gap-3 border ${
                feedback.type === 'success'
                  ? 'bg-[#72D6A0]/10 border-[#72D6A0]/30 text-[#72D6A0]'
                  : 'bg-[#FF7777]/10 border-[#FF7777]/30 text-[#FF7777]'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-[#72D6A0] shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-[#FF7777] shrink-0" />
              )}
              <span className="text-xs font-medium">{feedback.text}</span>
            </div>
          )}

          <div className="rounded-xl bg-[#171B18] border border-[#303831] overflow-hidden shadow-xl">
            {loading ? (
              <div className="p-8 space-y-3">
                <div className="flex items-center justify-center gap-2 py-4 text-xs text-[#A0A89F]">
                  <Loader2 className="w-4 h-4 animate-spin text-[#C6F36B]" />
                  <span>Loading course catalog...</span>
                </div>
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-12 bg-[#202622]/60 rounded-xl border border-[#303831]/40 animate-pulse"
                  />
                ))}
              </div>
            ) : subjects.length === 0 ? (
              <div className="p-12 text-center text-[#A0A89F]">
                <p className="text-sm font-semibold text-[#F1F3ED]">No subjects cataloged</p>
                <p className="text-xs text-[#A0A89F] mt-1">
                  Add the first course using the button above.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#101211]/80 text-[#A0A89F] font-semibold uppercase tracking-wider border-b border-[#303831]">
                    <tr>
                      <th className="py-3 px-4">Course Code</th>
                      <th className="py-3 px-4">Subject Title</th>
                      <th className="py-3 px-4">Designated Faculty</th>
                      <th className="py-3 px-4 text-center">Enrolled Students</th>
                      <th className="py-3 px-4 text-center">Conducted Sessions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#303831]/60 text-[#F1F3ED]">
                    {subjects.map((sub) => (
                      <tr key={sub.id} className="hover:bg-[#202622]/50 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-[#C6F36B]">
                          {sub.code}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-[#F1F3ED]">{sub.name}</td>
                        <td className="py-3.5 px-4 text-[#A0A89F]">
                          <div>
                            <span className="font-medium text-[#F1F3ED]">{sub.faculty?.name}</span>
                            <span className="text-[11px] text-[#A0A89F] block">
                              {sub.faculty?.employeeId} • {sub.faculty?.department}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#202622] text-[#C6F36B] border border-[#303831]">
                            <Users className="w-3 h-3" />
                            {sub._count?.enrollments || 0}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#202622] text-[#A0A89F] border border-[#303831]">
                            <CalendarCheck className="w-3 h-3 text-[#C6F36B]" />
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
            <div className="fixed inset-0 z-50 bg-[#101211]/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-md rounded-xl bg-[#171B18] border border-[#303831] p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-[#F1F3ED]">Create Course Subject</h3>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-[#A0A89F] hover:text-[#F1F3ED]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-xs text-[#A0A89F] mb-5">
                  Define a unique course code and assign an accredited instructor.
                </p>

                <form onSubmit={handleCreateSubject} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-[#A0A89F] mb-1">
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
                      className="w-full px-3 py-2 rounded-xl bg-[#202622] border border-[#303831] text-xs text-[#F1F3ED] placeholder-[#A0A89F] focus:outline-none focus:border-[#C6F36B] font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#A0A89F] mb-1">
                      Subject Title
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Cloud Computing & Microservices"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-[#202622] border border-[#303831] text-xs text-[#F1F3ED] placeholder-[#A0A89F] focus:outline-none focus:border-[#C6F36B]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#A0A89F] mb-1">
                      Assigned Faculty Instructor
                    </label>
                    <select
                      value={formData.facultyId}
                      onChange={(e) => setFormData({ ...formData, facultyId: e.target.value })}
                      required
                      className="w-full px-3 py-2 rounded-xl bg-[#202622] border border-[#303831] text-xs text-[#F1F3ED] focus:outline-none focus:border-[#C6F36B]"
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
                      className="px-4 py-2 rounded-xl bg-[#202622] hover:bg-[#303831] text-xs font-semibold text-[#A0A89F] border border-[#303831]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-2 rounded-xl bg-[#C6F36B] hover:bg-[#b5e855] disabled:opacity-50 text-xs font-bold text-[#101211] flex items-center gap-1.5"
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
