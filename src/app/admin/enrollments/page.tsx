'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { Role } from '@prisma/client';
import {
  UserPlus,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Filter,
  Upload,
  FileSpreadsheet,
  X,
} from 'lucide-react';

export default function AdminEnrollmentsPage() {
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const [formData, setFormData] = useState({
    studentId: '',
    subjectId: '',
  });

  const [csvInput, setCsvInput] = useState('');

  const loadAll = async () => {
    try {
      const url = selectedSubjectFilter
        ? `/api/enrollments?subjectId=${selectedSubjectFilter}`
        : '/api/enrollments';

      const [enrRes, stdRes, subRes] = await Promise.all([
        fetch(url),
        fetch('/api/students'),
        fetch('/api/subjects'),
      ]);

      const [enrData, stdData, subData] = await Promise.all([
        enrRes.json(),
        stdRes.json(),
        subRes.json(),
      ]);

      if (enrData.enrollments) setEnrollments(enrData.enrollments);
      if (stdData.students) {
        setStudents(stdData.students);
        if (stdData.students.length > 0 && !formData.studentId) {
          setFormData((prev) => ({ ...prev, studentId: stdData.students[0].id }));
        }
      }
      if (subData.subjects) {
        setSubjects(subData.subjects);
        if (subData.subjects.length > 0 && !formData.subjectId) {
          setFormData((prev) => ({ ...prev, subjectId: subData.subjects[0].id }));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [selectedSubjectFilter]);

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setFeedback({ type: 'success', text: 'Student enrolled in course successfully!' });
        setShowModal(false);
        loadAll();
      } else {
        setFeedback({ type: 'error', text: data.error || 'Failed to enroll student.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Network error.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleImportCsv = async (e: React.FormEvent) => {
    e.preventDefault();
    setImporting(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/admin/import/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvText: csvInput }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setFeedback({
          type: 'success',
          text: `Enrolled ${data.importedCount} students successfully (${data.skippedCount} skipped/duplicates).`,
        });
        setShowImportModal(false);
        setCsvInput('');
        loadAll();
      } else {
        setFeedback({
          type: 'error',
          text: data.error || (data.details ? data.details.join('; ') : 'Enrollment CSV import failed.'),
        });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Enrollment CSV import failed.' });
    } finally {
      setImporting(false);
    }
  };

  const handleUnenroll = async (id: string, name: string, code: string) => {
    if (!confirm(`Are you sure you want to remove ${name} from ${code}?`)) return;

    try {
      const res = await fetch(`/api/enrollments?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setFeedback({ type: 'success', text: 'Enrollment removed.' });
        loadAll();
      } else {
        const data = await res.json();
        setFeedback({ type: 'error', text: data.error || 'Failed to remove enrollment.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
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
                <UserPlus className="w-7 h-7 text-teal-400" />
                Course Enrollments & Allocations
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Manage student class rosters and authorize students for attendance sessions.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => {
                  setShowImportModal(true);
                  setFeedback(null);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold transition-all"
              >
                <Upload className="w-4 h-4 text-teal-400" />
                Import Enrollment CSV
              </button>

              <button
                onClick={() => {
                  setShowModal(true);
                  setFeedback(null);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-teal-500/20"
              >
                <Plus className="w-4 h-4" />
                Enroll Student
              </button>
            </div>
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

          {/* Filter Bar */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800">
            <Filter className="w-4 h-4 text-slate-400 ml-1" />
            <span className="text-xs font-semibold text-slate-300">Filter by Subject:</span>
            <select
              value={selectedSubjectFilter}
              onChange={(e) => setSelectedSubjectFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
            >
              <option value="">All Subjects Roster</option>
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.code} — {sub.name}
                </option>
              ))}
            </select>
          </div>

          {/* Enrollments Table */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
            {loading ? (
              <div className="p-12 text-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-teal-400 mb-2" />
                <p className="text-xs">Loading course enrollments...</p>
              </div>
            ) : enrollments.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <p className="text-sm font-semibold text-slate-300">No enrollments recorded</p>
                <p className="text-xs text-slate-500 mt-1">
                  Assign students to subjects using the buttons above.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Student Roll</th>
                      <th className="py-3 px-4">Student Name</th>
                      <th className="py-3 px-4">Course Subject</th>
                      <th className="py-3 px-4">Faculty Instructor</th>
                      <th className="py-3 px-4">Enrolled On</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {enrollments.map((enr) => (
                      <tr key={enr.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-teal-400">
                          {enr.student.rollNumber}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-white">{enr.student.name}</td>
                        <td className="py-3.5 px-4">
                          <span className="font-mono text-amber-400 mr-1.5">{enr.subject.code}</span>
                          <span className="text-slate-300">{enr.subject.name}</span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-400">
                          {enr.subject.faculty?.name || 'Assigned Instructor'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400">
                          {new Date(enr.enrolledAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() =>
                              handleUnenroll(enr.id, enr.student.name, enr.subject.code)
                            }
                            title="Remove student from roster"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Modal: Enroll Single Student */}
          {showModal && (
            <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-white">Enroll Student in Subject</h3>
                  <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-xs text-slate-400 mb-5">
                  Grants the student authorization to mark attendance in QR sessions for this course.
                </p>

                <form onSubmit={handleEnroll} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Select Student
                    </label>
                    <select
                      value={formData.studentId}
                      onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                      required
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                    >
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.rollNumber} — {s.name} ({s.department})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Select Course Subject
                    </label>
                    <select
                      value={formData.subjectId}
                      onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                      required
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
                    >
                      {subjects.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.code} — {sub.name}
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
                      Authorize Enrollment
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal: CSV Bulk Import Enrollments */}
          {showImportModal && (
            <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-teal-400" />
                    Bulk Import Enrollments (CSV)
                  </h3>
                  <button
                    onClick={() => setShowImportModal(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-xs text-slate-400 mb-4">
                  Paste or upload a CSV file with columns:{' '}
                  <code className="text-teal-300 font-mono">rollNumber, subjectCode</code>
                </p>

                <form onSubmit={handleImportCsv} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Paste CSV Content
                    </label>
                    <textarea
                      rows={6}
                      required
                      value={csvInput}
                      onChange={(e) => setCsvInput(e.target.value)}
                      placeholder={`rollNumber,subjectCode\nURK25CS1140,24CS2001\nURK25CS1101,24CS2001\nURK25CS1102,24CS2002`}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 font-mono focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Or Choose File (.csv)
                    </label>
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            setCsvInput(event.target?.result as string);
                          };
                          reader.readAsText(file);
                        }
                      }}
                      className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-teal-400 hover:file:bg-slate-700"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3">
                    <button
                      type="button"
                      onClick={() => setShowImportModal(false)}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={importing || !csvInput.trim()}
                      className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-xs font-bold text-slate-950 flex items-center gap-1.5"
                    >
                      {importing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Process Enrollments
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
