'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { Role } from '@prisma/client';
import {
  GraduationCap,
  Search,
  Plus,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Upload,
  UserX,
  UserCheck,
  FileSpreadsheet,
  X,
} from 'lucide-react';

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    rollNumber: '',
    email: '',
    department: 'Computer Science and Engineering',
    academicYear: '2024-2028 (2nd Year)',
    classSection: 'CSE-A',
  });

  // CSV State
  const [csvInput, setCsvInput] = useState('');

  const fetchStudents = async () => {
    try {
      const res = await fetch(`/api/students?search=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (data.students) {
        setStudents(data.students);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudents();
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setFeedback({ type: 'success', text: 'Student registered successfully!' });
        setShowModal(false);
        setFormData({
          name: '',
          rollNumber: '',
          email: '',
          department: 'Computer Science and Engineering',
          academicYear: '2024-2028 (2nd Year)',
          classSection: 'CSE-A',
        });
        fetchStudents();
      } else {
        setFeedback({ type: 'error', text: data.error || 'Failed to register student.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Network error.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (studentId: string, currentActive: boolean) => {
    try {
      const res = await fetch('/api/students', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: studentId, isActive: !currentActive }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({
          type: 'success',
          text: `Student ${!currentActive ? 'activated' : 'deactivated'} successfully.`,
        });
        fetchStudents();
      } else {
        setFeedback({ type: 'error', text: data.error || 'Failed to update student status.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Network error.' });
    }
  };

  const handleImportCsv = async (e: React.FormEvent) => {
    e.preventDefault();
    setImporting(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/admin/import/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvText: csvInput }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setFeedback({
          type: 'success',
          text: `Imported ${data.importedCount} students successfully (${data.skippedCount} skipped/duplicates).`,
        });
        setShowImportModal(false);
        setCsvInput('');
        fetchStudents();
      } else {
        setFeedback({
          type: 'error',
          text: data.error || (data.details ? data.details.join('; ') : 'CSV import failed.'),
        });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'CSV Import failed.' });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <div className="flex-1 flex max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 gap-8">
        <Sidebar role={Role.ADMIN} />

        <main className="flex-1 min-w-0 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
                <GraduationCap className="w-7 h-7 text-teal-400" />
                Student Directory & Enrolled Rosters
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Maintain official student profiles, manage active status, and import institutional CSV rosters.
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
                Import CSV Roster
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

          {/* Feedback banner */}
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

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search by student name, roll number (e.g. URK25CS1140), or department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>

          {/* Table */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
            {loading ? (
              <div className="p-12 text-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-teal-400 mb-2" />
                <p className="text-xs">Querying student records...</p>
              </div>
            ) : students.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <p className="text-sm font-semibold text-slate-300">No students found</p>
                <p className="text-xs text-slate-500 mt-1">
                  Adjust your search or register a new student using the buttons above.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Roll Number</th>
                      <th className="py-3 px-4">Full Name</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Section</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Courses</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {students.map((s) => {
                      const isActive = s.isActive ?? s.user?.isActive ?? true;
                      return (
                        <tr
                          key={s.id}
                          className={`hover:bg-slate-800/40 transition-colors ${
                            !isActive ? 'opacity-60 bg-rose-950/10' : ''
                          }`}
                        >
                          <td className="py-3.5 px-4 font-mono font-bold text-teal-400">
                            {s.rollNumber}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-white">{s.name}</td>
                          <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                            {s.user?.email}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-300">
                            {s.classSection || 'CSE-A'}
                          </td>
                          <td className="py-3.5 px-4 text-slate-300 truncate max-w-[140px]">
                            {s.department}
                          </td>
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
                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                              <BookOpen className="w-3 h-3 text-teal-400" />
                              {s._count?.enrollments || s.enrollments?.length || 0}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => handleToggleStatus(s.id, isActive)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                                isActive
                                  ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30'
                                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              }`}
                              title={isActive ? 'Deactivate student account' : 'Reactivate student account'}
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

          {/* Modal: Enroll Single Student */}
          {showModal && (
            <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-white">Enroll New Student</h3>
                  <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-xs text-slate-400 mb-5">
                  Creates an authorized user record and linked academic student profile.
                </p>

                <form onSubmit={handleCreateStudent} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Full Legal Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Samuel David"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Roll Number
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="URK25CS1199"
                        value={formData.rollNumber}
                        onChange={(e) =>
                          setFormData({ ...formData, rollNumber: e.target.value.toUpperCase() })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Section / Class
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="CSE-A"
                        value={formData.classSection}
                        onChange={(e) =>
                          setFormData({ ...formData, classSection: e.target.value.toUpperCase() })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      University Email Address
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="student@karunya.edu"
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

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Academic Year
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.academicYear}
                      onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
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
                      Save Student
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal: CSV Bulk Import */}
          {showImportModal && (
            <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-teal-400" />
                    Bulk Import Student Roster (CSV)
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
                  <code className="text-teal-300 font-mono">
                    rollNumber, name, email, department, academicYear, classSection
                  </code>
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
                      placeholder={`rollNumber,name,email,department,academicYear,classSection\nURK25CS1201,Karthik M,karthik1201@karunya.edu,Computer Science,2024-2028 (2nd Year),CSE-A\nURK25CS1202,Divya R,divya1202@karunya.edu,Computer Science,2024-2028 (2nd Year),CSE-A`}
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
                      Process CSV Roster
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
