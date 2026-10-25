'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { Role } from '@prisma/client';
import {
  Users,
  Search,
  Plus,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  UserCheck,
  UserX,
  X,
  Layers,
} from 'lucide-react';

export default function AdminFacultyPage() {
  const [faculty, setFaculty] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState<any>(null);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const [formData, setFormData] = useState({
    name: '',
    employeeId: '',
    email: '',
    department: 'Computer Science and Engineering',
  });

  const fetchFaculty = async () => {
    try {
      const res = await fetch(`/api/faculty?search=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (data.faculty) {
        setFaculty(data.faculty);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const res = await fetch('/api/subjects');
      const data = await res.json();
      if (data.subjects) {
        setSubjects(data.subjects);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFaculty();
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const handleCreateFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/faculty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setFeedback({ type: 'success', text: 'Faculty profile created successfully!' });
        setShowModal(false);
        setFormData({
          name: '',
          employeeId: '',
          email: '',
          department: 'Computer Science and Engineering',
        });
        fetchFaculty();
      } else {
        setFeedback({ type: 'error', text: data.error || 'Failed to create faculty member.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Network error.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (facultyId: string, currentActive: boolean) => {
    try {
      const res = await fetch('/api/faculty', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: facultyId, isActive: !currentActive }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({
          type: 'success',
          text: `Faculty ${!currentActive ? 'activated' : 'deactivated'} successfully.`,
        });
        fetchFaculty();
      } else {
        setFeedback({ type: 'error', text: data.error || 'Failed to update faculty status.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Network error.' });
    }
  };

  const openAssignModal = (f: any) => {
    setSelectedFaculty(f);
    setSelectedSubjectIds(f.subjects?.map((s: any) => s.id) || []);
    setShowAssignModal(true);
  };

  const handleSaveAssignments = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFaculty) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/faculty', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedFaculty.id,
          subjectIds: selectedSubjectIds,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({
          type: 'success',
          text: `Course assignments updated for ${selectedFaculty.name}!`,
        });
        setShowAssignModal(false);
        fetchFaculty();
      } else {
        setFeedback({ type: 'error', text: data.error || 'Failed to update course assignments.' });
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

      <div className="flex-1 flex max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 gap-8">
        <Sidebar role={Role.ADMIN} />

        <main className="flex-1 min-w-0 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
                <Users className="w-7 h-7 text-indigo-400" />
                Faculty Directory & Teaching Allocations
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Manage academic faculty credentials, course assignments, and active account status.
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
              Add Faculty Member
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
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              )}
              <span className="text-xs font-medium">{feedback.text}</span>
            </div>
          )}

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search by faculty name, employee ID (e.g. EMP-CS-101), or department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
            {loading ? (
              <div className="p-12 text-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-teal-400 mb-2" />
                <p className="text-xs">Querying faculty directory...</p>
              </div>
            ) : faculty.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <p className="text-sm font-semibold text-slate-300">No faculty found</p>
                <p className="text-xs text-slate-500 mt-1">
                  Adjust your search query or register a new faculty member.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Employee ID</th>
                      <th className="py-3 px-4">Faculty Name</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4">Assigned Courses</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {faculty.map((f) => {
                      const isActive = f.isActive ?? f.user?.isActive ?? true;
                      return (
                        <tr
                          key={f.id}
                          className={`hover:bg-slate-800/40 transition-colors ${
                            !isActive ? 'opacity-60 bg-rose-950/10' : ''
                          }`}
                        >
                          <td className="py-3.5 px-4 font-mono font-bold text-indigo-400">
                            {f.employeeId}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-white">{f.name}</td>
                          <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                            {f.user?.email}
                          </td>
                          <td className="py-3.5 px-4 text-slate-300">{f.department}</td>
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                isActive
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              }`}
                            >
                              {isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex flex-wrap gap-1.5 items-center">
                              {f.subjects?.length > 0 ? (
                                f.subjects.map((s: any) => (
                                  <span
                                    key={s.id}
                                    className="px-2 py-0.5 rounded bg-slate-800 text-teal-300 text-[10px] font-mono border border-slate-700"
                                  >
                                    {s.code}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[11px] text-slate-500 italic">No courses assigned</span>
                              )}
                              <button
                                onClick={() => openAssignModal(f)}
                                className="text-[10px] text-teal-400 hover:text-teal-300 font-semibold underline ml-1"
                              >
                                Edit
                              </button>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => handleToggleStatus(f.id, isActive)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                                isActive
                                  ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30'
                                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              }`}
                            >
                              {isActive ? (
                                <>
                                  <UserX className="w-3 h-3" /> Deactivate
                                </>
                              ) : (
                                <>
                                  <UserCheck className="w-3 h-3" /> Reactivate
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Modal: Add Faculty */}
          {showModal && (
            <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-white">Add Faculty Member</h3>
                  <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-xs text-slate-400 mb-5">
                  Registers an authorized faculty account with course creation capabilities.
                </p>

                <form onSubmit={handleCreateFaculty} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Faculty Name & Designation
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dr. R. Sundar Raj"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Employee ID
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. EMP-CS-103"
                      value={formData.employeeId}
                      onChange={(e) =>
                        setFormData({ ...formData, employeeId: e.target.value.toUpperCase() })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Institutional Email Address
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. faculty@karunya.edu"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Department
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                    />
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
                      Save Faculty
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal: Assign Subjects to Faculty */}
          {showAssignModal && selectedFaculty && (
            <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Layers className="w-5 h-5 text-indigo-400" />
                    Assign Courses
                  </h3>
                  <button
                    onClick={() => setShowAssignModal(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-xs text-slate-400 mb-4">
                  Select subjects to be taught by <strong className="text-white">{selectedFaculty.name}</strong> ({selectedFaculty.employeeId}):
                </p>

                <form onSubmit={handleSaveAssignments} className="space-y-4">
                  <div className="max-h-60 overflow-y-auto space-y-2 p-1">
                    {subjects.map((sub) => {
                      const isChecked = selectedSubjectIds.includes(sub.id);
                      return (
                        <label
                          key={sub.id}
                          className={`flex items-center gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                            isChecked
                              ? 'bg-teal-500/10 border-teal-500/40 text-white'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedSubjectIds([...selectedSubjectIds, sub.id]);
                              } else {
                                setSelectedSubjectIds(
                                  selectedSubjectIds.filter((id) => id !== sub.id)
                                );
                              }
                            }}
                            className="rounded text-teal-500 focus:ring-teal-500"
                          />
                          <div>
                            <span className="font-mono font-bold text-teal-400">{sub.code}: </span>
                            <span className="font-semibold text-slate-200">{sub.name}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowAssignModal(false)}
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
                      Update Assignments
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
