'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
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
  UserX,
  UserCheck,
  FileSpreadsheet,
  X,
  Pencil,
  RefreshCw,
} from 'lucide-react';

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
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
  });

  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    department: '',
    academicYear: '',
  });

  // CSV State
  const [csvInput, setCsvInput] = useState('');
  const isFirstMount = useRef(true);

  const fetchStudents = async (query = search) => {
    try {
      const res = await fetch(`/api/students?search=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (res.ok && data.students) {
        setStudents(data.students);
      } else {
        setFeedback({
          type: 'error',
          text: data.error || 'Failed to load students directory.',
        });
      }
    } catch (err: any) {
      console.error('Failed to fetch students:', err);
      setFeedback({
        type: 'error',
        text: err.message || 'Network error while fetching students.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents('');
  }, []);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    const timer = setTimeout(() => {
      fetchStudents(search);
    }, 200);
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

  const handleEditClick = (student: any) => {
    setEditingStudent(student);
    setEditFormData({
      name: student.name || '',
      email: student.user?.email || '',
      department: student.department || '',
      academicYear: student.academicYear || '',
    });
    setShowEditModal(true);
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/students', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingStudent.id,
          name: editFormData.name,
          email: editFormData.email,
          department: editFormData.department,
          academicYear: editFormData.academicYear,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setFeedback({ type: 'success', text: `Student profile updated for ${editFormData.name}!` });
        setShowEditModal(false);
        setEditingStudent(null);
        fetchStudents();
      } else {
        setFeedback({ type: 'error', text: data.error || 'Failed to update student.' });
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
    if (!csvInput.trim()) return;

    setImporting(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/admin/import/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv: csvInput }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setFeedback({
          type: 'success',
          text: `Import completed! Successfully imported ${data.importedCount} student(s).`,
        });
        setShowImportModal(false);
        setCsvInput('');
        fetchStudents();
      } else {
        setFeedback({ type: 'error', text: data.error || 'Import failed.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Network error during CSV import.' });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#101211] text-[#F1F3ED] flex flex-col">
      <Navbar />

      <div className="flex-1 flex max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 gap-8">
        <Sidebar role={Role.ADMIN} />

        <main className="flex-1 min-w-0 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#F1F3ED] tracking-tight flex items-center gap-2.5">
                <GraduationCap className="w-7 h-7 text-[#C6F36B]" />
                Student Directory & Enrolled Rosters
              </h1>
              <p className="text-xs sm:text-sm text-[#A0A89F] mt-1">
                Maintain official student profiles, manage active status, and import institutional CSV rosters.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => {
                  setLoading(true);
                  fetchStudents();
                }}
                disabled={loading}
                className="p-2.5 rounded-xl bg-[#171B18] border border-[#303831] hover:border-[#C6F36B]/40 text-[#A0A89F] hover:text-[#F1F3ED] transition-all"
                title="Refresh student list"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#C6F36B]' : ''}`} />
              </button>

              <Link
                href="/bosshere/students/bulk"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#171B18] hover:bg-[#202622] border border-[#303831] text-[#F1F3ED] text-xs font-semibold transition-all shadow-sm"
              >
                <FileSpreadsheet className="w-4 h-4 text-[#C6F36B]" />
                Bulk Student Registration
              </Link>

              <button
                onClick={() => {
                  setShowModal(true);
                  setFeedback(null);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#C6F36B] hover:bg-[#b5e855] text-[#101211] text-xs font-bold transition-all shadow-lg shadow-[#C6F36B]/20"
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

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A0A89F]" />
            <input
              type="text"
              placeholder="Search by student name, roll number, or department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#171B18] border border-[#303831] text-xs text-[#F1F3ED] placeholder-[#A0A89F] focus:outline-none focus:border-[#C6F36B] transition-colors"
            />
          </div>

          {/* Table */}
          <div className="rounded-xl bg-[#171B18] border border-[#303831] overflow-hidden shadow-xl">
            {loading ? (
              <div className="p-8 space-y-3">
                <div className="flex items-center justify-center gap-2 py-4 text-xs text-[#A0A89F]">
                  <Loader2 className="w-4 h-4 animate-spin text-[#C6F36B]" />
                  <span>Loading student records...</span>
                </div>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="h-12 bg-[#202622]/60 rounded-xl border border-[#303831]/40 animate-pulse"
                  />
                ))}
              </div>
            ) : students.length === 0 ? (
              <div className="p-12 text-center text-[#A0A89F]">
                <p className="text-sm font-semibold text-[#F1F3ED]">No students found</p>
                <p className="text-xs text-[#A0A89F] mt-1">
                  Adjust your search or register a new student using the buttons above.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#101211]/80 text-[#A0A89F] font-semibold uppercase tracking-wider border-b border-[#303831]">
                    <tr>
                      <th className="py-3 px-4">Roll Number</th>
                      <th className="py-3 px-4">Full Name</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4 text-center">Attendance %</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Courses</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#303831]/60 text-[#F1F3ED]">
                    {students.map((s) => {
                      const isActive = s.isActive ?? s.user?.isActive ?? true;
                      return (
                        <tr
                          key={s.id}
                          className={`hover:bg-[#202622]/50 transition-colors ${
                            !isActive ? 'opacity-60 bg-[#FF7777]/5' : ''
                          }`}
                        >
                          <td className="py-3.5 px-4 font-mono font-bold text-[#C6F36B]">
                            {s.rollNumber}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-[#F1F3ED]">{s.name}</td>
                          <td className="py-3.5 px-4 text-[#A0A89F] font-mono text-[11px]">
                            {s.user?.email}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono text-xs">
                            <span
                              className={`font-bold ${
                                (s.attendancePercentage ?? 0) >= 75
                                  ? 'text-[#C6F36B]'
                                  : (s.attendancePercentage ?? 0) > 0
                                  ? 'text-[#F0BC65]'
                                  : 'text-[#A0A89F]'
                              }`}
                            >
                              {s.attendancePercentage !== undefined
                                ? `${s.attendancePercentage}%`
                                : 'N/A'}
                            </span>
                            <span className="text-[10px] text-[#A0A89F] ml-1.5">
                              ({s.totalAttended ?? 0}/{s.totalConducted ?? 0})
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-[#A0A89F] truncate max-w-[140px]">
                            {s.department}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                isActive
                                  ? 'bg-[#C6F36B]/15 text-[#C6F36B] border-[#C6F36B]/30'
                                  : 'bg-[#FF7777]/15 text-[#FF7777] border-[#FF7777]/30'
                              }`}
                            >
                              {isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#202622] text-[#A0A89F] border border-[#303831]">
                              <BookOpen className="w-3 h-3 text-[#C6F36B]" />
                              {s._count?.enrollments || s.enrollments?.length || 0}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => handleEditClick(s)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border bg-[#202622] hover:bg-[#303831] text-[#C6F36B] border-[#303831] transition-colors mr-2"
                              title="Edit student and email"
                            >
                              <Pencil className="w-3 h-3" /> Edit
                            </button>
                            <button
                              onClick={() => handleToggleStatus(s.id, isActive)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                                isActive
                                  ? 'bg-[#FF7777]/10 hover:bg-[#FF7777]/20 text-[#FF7777] border-[#FF7777]/30'
                                  : 'bg-[#C6F36B]/10 hover:bg-[#C6F36B]/20 text-[#C6F36B] border-[#C6F36B]/30'
                              }`}
                              title={
                                isActive ? 'Deactivate student account' : 'Reactivate student account'
                              }
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
            <div className="fixed inset-0 z-50 bg-[#101211]/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-md rounded-xl bg-[#171B18] border border-[#303831] p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-[#F1F3ED]">Enroll New Student</h3>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-[#A0A89F] hover:text-[#F1F3ED]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-xs text-[#A0A89F] mb-5">
                  Creates an authorized user record and linked academic student profile.
                </p>

                <form onSubmit={handleCreateStudent} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-[#A0A89F] mb-1">
                      Full Legal Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Samuel David"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-[#202622] border border-[#303831] text-xs text-[#F1F3ED] placeholder-[#A0A89F] focus:outline-none focus:border-[#C6F36B]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#A0A89F] mb-1">
                      Roll Number
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 24CS1001"
                      value={formData.rollNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, rollNumber: e.target.value.toUpperCase() })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-[#202622] border border-[#303831] text-xs text-[#F1F3ED] placeholder-[#A0A89F] focus:outline-none focus:border-[#C6F36B] font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#A0A89F] mb-1">
                      University Email Address
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="student@karunya.edu"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-[#202622] border border-[#303831] text-xs text-[#F1F3ED] placeholder-[#A0A89F] focus:outline-none focus:border-[#C6F36B]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#A0A89F] mb-1">
                      Department
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-[#202622] border border-[#303831] text-xs text-[#F1F3ED] placeholder-[#A0A89F] focus:outline-none focus:border-[#C6F36B]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#A0A89F] mb-1">
                      Academic Year
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.academicYear}
                      onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-[#202622] border border-[#303831] text-xs text-[#F1F3ED] placeholder-[#A0A89F] focus:outline-none focus:border-[#C6F36B]"
                    />
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
                      Save Student
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal: Edit Student */}
          {showEditModal && editingStudent && (
            <div className="fixed inset-0 z-50 bg-[#101211]/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-md rounded-xl bg-[#171B18] border border-[#303831] p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-[#F1F3ED]">Edit Student Details</h3>
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="text-[#A0A89F] hover:text-[#F1F3ED]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-xs text-[#A0A89F] mb-5">
                  Update student profile or correct email address for Google OAuth identity matching.
                </p>

                <form onSubmit={handleUpdateStudent} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-[#A0A89F] mb-1">
                      Roll Number (Immutable)
                    </label>
                    <input
                      type="text"
                      disabled
                      value={editingStudent.rollNumber}
                      className="w-full px-3 py-2 rounded-xl bg-[#101211] border border-[#303831] text-xs text-[#A0A89F] font-mono cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#A0A89F] mb-1">
                      Full Legal Name
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-[#202622] border border-[#303831] text-xs text-[#F1F3ED] placeholder-[#A0A89F] focus:outline-none focus:border-[#C6F36B]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#A0A89F] mb-1">
                      Institutional Email (Must Match Google Account)
                    </label>
                    <input
                      type="email"
                      required
                      value={editFormData.email}
                      onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-[#202622] border border-[#303831] text-xs text-[#F1F3ED] placeholder-[#A0A89F] focus:outline-none focus:border-[#C6F36B]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#A0A89F] mb-1">
                      Department
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormData.department}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, department: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-[#202622] border border-[#303831] text-xs text-[#F1F3ED] placeholder-[#A0A89F] focus:outline-none focus:border-[#C6F36B]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#A0A89F] mb-1">
                      Academic Year
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormData.academicYear}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, academicYear: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-[#202622] border border-[#303831] text-xs text-[#F1F3ED] placeholder-[#A0A89F] focus:outline-none focus:border-[#C6F36B]"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3">
                    <button
                      type="button"
                      onClick={() => setShowEditModal(false)}
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
                      Update Student
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal: CSV Bulk Import */}
          {showImportModal && (
            <div className="fixed inset-0 z-50 bg-[#101211]/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-lg rounded-xl bg-[#171B18] border border-[#303831] p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-[#F1F3ED] flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-[#C6F36B]" />
                    Bulk Import Student Roster (CSV)
                  </h3>
                  <button
                    onClick={() => setShowImportModal(false)}
                    className="text-[#A0A89F] hover:text-[#F1F3ED]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-xs text-[#A0A89F] mb-4">
                  Paste or upload a CSV file with columns:{' '}
                  <code className="text-[#C6F36B] font-mono">
                    rollNumber, name, email, department, academicYear, classSection
                  </code>
                </p>

                <form onSubmit={handleImportCsv} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-[#A0A89F] mb-1">
                      Paste CSV Content
                    </label>
                    <textarea
                      rows={6}
                      required
                      value={csvInput}
                      onChange={(e) => setCsvInput(e.target.value)}
                      placeholder={`rollNumber,name,email,department,academicYear,classSection\nROLL001,Student Name,student@institution.edu,Department,2024-2028,Section-A`}
                      className="w-full px-3 py-2.5 rounded-xl bg-[#202622] border border-[#303831] text-xs text-[#F1F3ED] placeholder-[#A0A89F] font-mono focus:outline-none focus:border-[#C6F36B]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#A0A89F] mb-1">
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
                      className="block w-full text-xs text-[#A0A89F] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#202622] file:text-[#C6F36B] hover:file:bg-[#303831] border border-[#303831] rounded-xl p-1"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3">
                    <button
                      type="button"
                      onClick={() => setShowImportModal(false)}
                      className="px-4 py-2 rounded-xl bg-[#202622] hover:bg-[#303831] text-xs font-semibold text-[#A0A89F] border border-[#303831]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={importing || !csvInput.trim()}
                      className="px-4 py-2 rounded-xl bg-[#C6F36B] hover:bg-[#b5e855] disabled:opacity-50 text-xs font-bold text-[#101211] flex items-center gap-1.5"
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
