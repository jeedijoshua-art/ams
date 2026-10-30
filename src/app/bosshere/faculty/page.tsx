'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  KeyRound,
  Copy,
  Check,
  RefreshCw,
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
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [createdCredential, setCreatedCredential] = useState<{ email: string; password?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    employeeId: '',
    email: '',
    department: 'Computer Science and Engineering',
    password: '',
  });

  const isFirstMount = useRef(true);

  // Fast initial parallel load: fetch subjects and faculty concurrently
  const loadInitialData = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const [facRes, subRes] = await Promise.all([
        fetch('/api/faculty?search='),
        fetch('/api/subjects'),
      ]);

      const [facData, subData] = await Promise.all([
        facRes.json(),
        subRes.json(),
      ]);

      if (facRes.ok && facData.faculty) {
        setFaculty(facData.faculty);
      } else {
        setFeedback({
          type: 'error',
          text: facData.error || 'Failed to load faculty directory.',
        });
      }

      if (subRes.ok && subData.subjects) {
        setSubjects(subData.subjects);
      }
    } catch (err: any) {
      console.error('Initial faculty load error:', err);
      setFeedback({
        type: 'error',
        text: err.message || 'Network error while loading faculty directory.',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchFaculty = async (query = search) => {
    try {
      const res = await fetch(`/api/faculty?search=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (res.ok && data.faculty) {
        setFaculty(data.faculty);
      } else {
        setFeedback({
          type: 'error',
          text: data.error || 'Failed to search faculty directory.',
        });
      }
    } catch (err: any) {
      console.error('Faculty search error:', err);
      setFeedback({
        type: 'error',
        text: err.message || 'Network error while searching.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    const timer = setTimeout(() => {
      fetchFaculty(search);
    }, 200);
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
        if (data.temporaryPassword) {
          setCreatedCredential({
            email: formData.email,
            password: data.temporaryPassword,
          });
        }
        setShowModal(false);
        setFormData({
          name: '',
          employeeId: '',
          email: '',
          department: 'Computer Science and Engineering',
          password: '',
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

  const handleResetPassword = async (f: any) => {
    if (!confirm(`Are you sure you want to reset the password for ${f.name} (${f.user?.email})?`)) return;
    setResettingId(f.id);
    setFeedback(null);
    try {
      const res = await fetch('/api/faculty', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: f.id, resetPassword: true }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCreatedCredential({
          email: f.user?.email,
          password: data.temporaryPassword,
        });
        setFeedback({ type: 'success', text: `Password reset successfully for ${f.name}!` });
      } else {
        setFeedback({ type: 'error', text: data.error || 'Failed to reset password.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Network error.' });
    } finally {
      setResettingId(null);
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
    <div className="min-h-screen bg-[#101211] text-[#F1F3ED] flex flex-col">
      <Navbar />

      <div className="flex-1 flex max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 gap-8">
        <Sidebar role={Role.ADMIN} />

        <main className="flex-1 min-w-0 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#F1F3ED] tracking-tight flex items-center gap-2.5">
                <Users className="w-7 h-7 text-[#C6F36B]" />
                Faculty Directory & Teaching Allocations
              </h1>
              <p className="text-xs sm:text-sm text-[#A0A89F] mt-1">
                Manage academic faculty credentials, course assignments, and active account status.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setLoading(true);
                  fetchFaculty();
                }}
                disabled={loading}
                className="p-2.5 rounded-xl bg-[#171B18] border border-[#303831] hover:border-[#C6F36B]/40 text-[#A0A89F] hover:text-[#F1F3ED] transition-all"
                title="Refresh faculty list"
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
                Add Faculty Member
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

          {createdCredential && (
            <div className="p-4 rounded-xl border bg-[#F0BC65]/10 border-[#F0BC65]/30 text-[#F0BC65] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-[#F0BC65]">
                  <KeyRound className="w-4 h-4" /> Provisioned Credentials (Copy Immediately)
                </span>
                <button
                  onClick={() => setCreatedCredential(null)}
                  className="text-[#A0A89F] hover:text-[#F1F3ED] text-xs"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-[#A0A89F]">
                Email: <strong className="font-mono text-[#F1F3ED]">{createdCredential.email}</strong>
                <br />
                Password:{' '}
                <strong className="font-mono text-[#F1F3ED] bg-[#101211] px-2 py-0.5 rounded border border-[#303831]">
                  {createdCredential.password}
                </strong>
              </p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    `Email: ${createdCredential.email}\nPassword: ${createdCredential.password}`
                  );
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#F0BC65] hover:bg-[#F0BC65]/90 text-[#101211] text-xs font-bold transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied to Clipboard' : 'Copy Credentials'}
              </button>
            </div>
          )}

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A0A89F]" />
            <input
              type="text"
              placeholder="Search by faculty name, employee ID (e.g. EMP-CS-101), or department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#171B18] border border-[#303831] text-xs text-[#F1F3ED] placeholder-[#A0A89F] focus:outline-none focus:border-[#C6F36B] transition-colors"
            />
          </div>

          <div className="rounded-xl bg-[#171B18] border border-[#303831] overflow-hidden shadow-xl">
            {loading ? (
              <div className="p-8 space-y-3">
                <div className="flex items-center justify-center gap-2 py-4 text-xs text-[#A0A89F]">
                  <Loader2 className="w-4 h-4 animate-spin text-[#C6F36B]" />
                  <span>Loading faculty directory...</span>
                </div>
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-12 bg-[#202622]/60 rounded-xl border border-[#303831]/40 animate-pulse"
                  />
                ))}
              </div>
            ) : faculty.length === 0 ? (
              <div className="p-12 text-center text-[#A0A89F]">
                <p className="text-sm font-semibold text-[#F1F3ED]">No faculty found</p>
                <p className="text-xs text-[#A0A89F] mt-1">
                  Adjust your search query or register a new faculty member.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#101211]/80 text-[#A0A89F] font-semibold uppercase tracking-wider border-b border-[#303831]">
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
                  <tbody className="divide-y divide-[#303831]/60 text-[#F1F3ED]">
                    {faculty.map((f) => {
                      const isActive = f.isActive ?? f.user?.isActive ?? true;
                      return (
                        <tr
                          key={f.id}
                          className={`hover:bg-[#202622]/50 transition-colors ${
                            !isActive ? 'opacity-60 bg-[#FF7777]/5' : ''
                          }`}
                        >
                          <td className="py-3.5 px-4 font-mono font-bold text-[#C6F36B]">
                            {f.employeeId}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-[#F1F3ED]">{f.name}</td>
                          <td className="py-3.5 px-4 text-[#A0A89F] font-mono text-[11px]">
                            {f.user?.email}
                          </td>
                          <td className="py-3.5 px-4 text-[#A0A89F]">{f.department}</td>
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
                          <td className="py-3.5 px-4">
                            <div className="flex flex-wrap gap-1.5 items-center">
                              {f.subjects?.length > 0 ? (
                                f.subjects.map((s: any) => (
                                  <span
                                    key={s.id}
                                    className="px-2 py-0.5 rounded bg-[#202622] text-[#C6F36B] text-[10px] font-mono border border-[#303831]"
                                  >
                                    {s.code}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[11px] text-[#A0A89F] italic">
                                  No courses assigned
                                </span>
                              )}
                              <button
                                onClick={() => openAssignModal(f)}
                                className="text-[10px] text-[#C6F36B] hover:underline font-semibold ml-1"
                              >
                                Edit
                              </button>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => handleResetPassword(f)}
                              disabled={resettingId === f.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border bg-[#202622] hover:bg-[#303831] text-[#F0BC65] border-[#303831] transition-colors mr-2 disabled:opacity-50"
                              title="Reset faculty password"
                            >
                              {resettingId === f.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <KeyRound className="w-3 h-3" />
                              )}
                              Reset Pass
                            </button>
                            <button
                              onClick={() => handleToggleStatus(f.id, isActive)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                                isActive
                                  ? 'bg-[#FF7777]/10 hover:bg-[#FF7777]/20 text-[#FF7777] border-[#FF7777]/30'
                                  : 'bg-[#C6F36B]/10 hover:bg-[#C6F36B]/20 text-[#C6F36B] border-[#C6F36B]/30'
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
            <div className="fixed inset-0 z-50 bg-[#101211]/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-md rounded-xl bg-[#171B18] border border-[#303831] p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-[#F1F3ED]">Add Faculty Member</h3>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-[#A0A89F] hover:text-[#F1F3ED]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-xs text-[#A0A89F] mb-5">
                  Registers an authorized faculty account with course creation capabilities.
                </p>

                <form onSubmit={handleCreateFaculty} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-[#A0A89F] mb-1">
                      Faculty Name & Designation
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dr. R. Sundar Raj"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-[#202622] border border-[#303831] text-xs text-[#F1F3ED] placeholder-[#A0A89F] focus:outline-none focus:border-[#C6F36B]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#A0A89F] mb-1">
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
                      className="w-full px-3 py-2 rounded-xl bg-[#202622] border border-[#303831] text-xs text-[#F1F3ED] placeholder-[#A0A89F] focus:outline-none focus:border-[#C6F36B] font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#A0A89F] mb-1">
                      Institutional Email Address
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. faculty@karunya.edu"
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
                      Initial Password (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Leave blank to auto-generate secure password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-[#202622] border border-[#303831] text-xs text-[#F1F3ED] placeholder-[#A0A89F] focus:outline-none focus:border-[#C6F36B] font-mono"
                    />
                    <p className="text-[10px] text-[#A0A89F] mt-1">
                      If left blank, a secure random password will be auto-generated and shown above.
                    </p>
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
                      Save Faculty
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal: Assign Subjects to Faculty */}
          {showAssignModal && selectedFaculty && (
            <div className="fixed inset-0 z-50 bg-[#101211]/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-md rounded-xl bg-[#171B18] border border-[#303831] p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-[#F1F3ED] flex items-center gap-2">
                    <Layers className="w-5 h-5 text-[#C6F36B]" />
                    Assign Courses
                  </h3>
                  <button
                    onClick={() => setShowAssignModal(false)}
                    className="text-[#A0A89F] hover:text-[#F1F3ED]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-xs text-[#A0A89F] mb-4">
                  Select subjects to be taught by{' '}
                  <strong className="text-[#F1F3ED]">{selectedFaculty.name}</strong> (
                  {selectedFaculty.employeeId}):
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
                              ? 'bg-[#C6F36B]/10 border-[#C6F36B]/40 text-[#F1F3ED]'
                              : 'bg-[#202622] border-[#303831] text-[#A0A89F] hover:bg-[#303831]/40'
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
                            className="rounded text-[#C6F36B] focus:ring-[#C6F36B] accent-[#C6F36B]"
                          />
                          <div>
                            <span className="font-mono font-bold text-[#C6F36B]">{sub.code}: </span>
                            <span className="font-semibold text-[#F1F3ED]">{sub.name}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#303831]">
                    <button
                      type="button"
                      onClick={() => setShowAssignModal(false)}
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
