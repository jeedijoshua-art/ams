'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Clock,
  Check,
  XCircle,
  Inbox,
  Search,
  BookOpen,
  RefreshCw,
} from 'lucide-react';

export default function AdminEnrollmentsPage() {
  const [activeTab, setActiveTab] = useState<'requests' | 'active'>('requests');
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [students, setStudents] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('');
  const [requestStatusFilter, setRequestStatusFilter] = useState('PENDING');
  const [requestSearch, setRequestSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [rejectModalTarget, setRejectModalTarget] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const [formData, setFormData] = useState({
    studentId: '',
    subjectId: '',
  });

  const [csvInput, setCsvInput] = useState('');
  const isFirstMount = useRef(true);

  const loadRequests = async () => {
    try {
      setRequestsLoading(true);
      const url = `/api/admin/enrollment-requests?status=${requestStatusFilter}${
        requestSearch ? `&search=${encodeURIComponent(requestSearch)}` : ''
      }`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.requests) {
        setRequests(data.requests);
        setPendingRequestsCount(data.pendingCount || 0);
      }
    } catch (err) {
      console.error('Failed to load requests:', err);
    } finally {
      setRequestsLoading(false);
    }
  };

  const loadAll = async () => {
    try {
      setLoading(true);
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
    loadRequests();
  }, [selectedSubjectFilter]);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    const timer = setTimeout(() => {
      loadRequests();
    }, 200);
    return () => clearTimeout(timer);
  }, [requestStatusFilter, requestSearch]);

  const handleReviewRequest = async (
    requestId: string,
    action: 'APPROVE' | 'REJECT',
    notes?: string
  ) => {
    setReviewingId(requestId);
    setFeedback(null);

    try {
      const res = await fetch(`/api/admin/enrollment-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          reviewNotes: notes || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setFeedback({
          type: 'success',
          text: `Enrollment request ${action === 'APPROVE' ? 'approved' : 'rejected'}.`,
        });
        setRejectModalTarget(null);
        setRejectReason('');
        loadRequests();
        loadAll();
      } else {
        setFeedback({
          type: 'error',
          text: data.error || 'Failed to review registration request.',
        });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Network error.' });
    } finally {
      setReviewingId(null);
    }
  };

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
        setFeedback({ type: 'success', text: 'Student enrolled successfully!' });
        setShowModal(false);
        loadAll();
      } else {
        setFeedback({ type: 'error', text: data.error || 'Enrollment failed.' });
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
      const res = await fetch('/api/admin/enrollment-requests/bulk-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv: csvInput }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setFeedback({
          type: 'success',
          text: `Bulk enrollment completed! Enrolled: ${data.enrolledCount}, Skipped: ${data.skippedCount}`,
        });
        setShowImportModal(false);
        setCsvInput('');
        loadAll();
      } else {
        setFeedback({ type: 'error', text: data.error || 'Bulk enrollment failed.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Network error.' });
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
    <div className="min-h-screen bg-[#101211] text-[#F1F3ED] flex flex-col">
      <Navbar />

      <div className="flex-1 flex max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 gap-8">
        <Sidebar role={Role.ADMIN} />

        <main className="flex-1 min-w-0 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#F1F3ED] tracking-tight flex items-center gap-2.5">
                <UserPlus className="w-7 h-7 text-[#C6F36B]" />
                Course Enrollments & Approval Queue
              </h1>
              <p className="text-xs sm:text-sm text-[#A0A89F] mt-1">
                Review student enrollment applications and manage authorized course rosters.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => {
                  loadAll();
                  loadRequests();
                }}
                disabled={loading || requestsLoading}
                className="p-2.5 rounded-xl bg-[#171B18] border border-[#303831] hover:border-[#C6F36B]/40 text-[#A0A89F] hover:text-[#F1F3ED] transition-all"
                title="Refresh rosters"
              >
                <RefreshCw
                  className={`w-4 h-4 ${loading || requestsLoading ? 'animate-spin text-[#C6F36B]' : ''}`}
                />
              </button>

              <button
                onClick={() => {
                  setShowImportModal(true);
                  setFeedback(null);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#171B18] hover:bg-[#202622] border border-[#303831] text-[#F1F3ED] text-xs font-semibold transition-all"
              >
                <Upload className="w-4 h-4 text-[#C6F36B]" />
                Import Enrollment CSV
              </button>

              <button
                onClick={() => {
                  setShowModal(true);
                  setFeedback(null);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#C6F36B] hover:bg-[#b5e855] text-[#101211] text-xs font-bold transition-all shadow-lg shadow-[#C6F36B]/20"
              >
                <Plus className="w-4 h-4" />
                Direct Enroll
              </button>
            </div>
          </div>

          {feedback && (
            <div
              className={`p-4 rounded-xl flex items-center gap-3 border transition-all ${
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

          {/* Primary View Switcher Tabs */}
          <div className="flex items-center gap-3 border-b border-[#303831] pb-2">
            <button
              onClick={() => setActiveTab('requests')}
              className={`pb-2 text-xs font-bold transition-all relative flex items-center gap-2 ${
                activeTab === 'requests'
                  ? 'text-[#C6F36B] border-b-2 border-[#C6F36B]'
                  : 'text-[#A0A89F] hover:text-[#F1F3ED]'
              }`}
            >
              <Inbox className="w-4 h-4" />
              Student Registration Requests
              {pendingRequestsCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#C6F36B] text-[#101211] animate-pulse">
                  {pendingRequestsCount} Pending
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('active')}
              className={`pb-2 text-xs font-bold transition-all relative flex items-center gap-2 ${
                activeTab === 'active'
                  ? 'text-[#C6F36B] border-b-2 border-[#C6F36B]'
                  : 'text-[#A0A89F] hover:text-[#F1F3ED]'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Active Course Rosters ({enrollments.length})
            </button>
          </div>

          {/* TAB 1: Student Registration Requests Queue */}
          {activeTab === 'requests' && (
            <div className="space-y-4">
              {/* Requests Filter Toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-[#A0A89F] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search requests by student or course..."
                    value={requestSearch}
                    onChange={(e) => setRequestSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#171B18] border border-[#303831] text-xs text-[#F1F3ED] placeholder-[#A0A89F] focus:outline-none focus:border-[#C6F36B]"
                  />
                </div>

                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#171B18] border border-[#303831] text-xs">
                  {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map((status) => (
                    <button
                      key={status}
                      onClick={() => setRequestStatusFilter(status)}
                      className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                        requestStatusFilter === status
                          ? 'bg-[#C6F36B] text-[#101211] font-bold shadow-sm'
                          : 'text-[#A0A89F] hover:text-[#F1F3ED]'
                      }`}
                    >
                      {status === 'ALL'
                        ? 'All'
                        : status.charAt(0) + status.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Requests Table */}
              <div className="rounded-2xl bg-[#171B18] border border-[#303831] overflow-hidden shadow-xl">
                {requestsLoading ? (
                  <div className="p-8 space-y-3">
                    <div className="flex items-center justify-center gap-2 py-4 text-xs text-[#A0A89F]">
                      <Loader2 className="w-4 h-4 animate-spin text-[#C6F36B]" />
                      <span>Loading registration queue...</span>
                    </div>
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-12 bg-[#202622]/60 rounded-xl border border-[#303831]/40 animate-pulse"
                      />
                    ))}
                  </div>
                ) : requests.length === 0 ? (
                  <div className="p-12 text-center text-[#A0A89F]">
                    <Inbox className="w-8 h-8 text-[#A0A89F]/50 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-[#F1F3ED]">
                      No {requestStatusFilter.toLowerCase()} enrollment requests
                    </p>
                    <p className="text-xs text-[#A0A89F] mt-1">
                      When students request course registration from their dashboard, they appear here for your approval.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#101211]/80 text-[#A0A89F] font-semibold uppercase tracking-wider border-b border-[#303831]">
                        <tr>
                          <th className="py-3 px-4">Student</th>
                          <th className="py-3 px-4">Requested Course</th>
                          <th className="py-3 px-4">Instructor</th>
                          <th className="py-3 px-4">Requested Date</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Review Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#303831]/60 text-[#F1F3ED]">
                        {requests.map((req) => {
                          const isReviewing = reviewingId === req.id;
                          return (
                            <tr key={req.id} className="hover:bg-[#202622]/50 transition-colors">
                              <td className="py-3 px-4">
                                <span className="font-mono font-bold text-[#C6F36B] block">
                                  {req.student.rollNumber}
                                </span>
                                <span className="text-[#F1F3ED] font-medium">{req.student.name}</span>
                                <span className="text-[10px] text-[#A0A89F] block">
                                  {req.student.department} • {req.student.academicYear}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-medium">
                                <span className="font-mono text-[#C6F36B] mr-1.5">
                                  {req.subject.code}
                                </span>
                                <span className="text-[#F1F3ED]">{req.subject.name}</span>
                              </td>
                              <td className="py-3 px-4 text-[#A0A89F]">
                                {req.subject.faculty?.name || 'Assigned Instructor'}
                              </td>
                              <td className="py-3 px-4 text-[#A0A89F] whitespace-nowrap">
                                {new Date(req.requestedAt).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                    req.status === 'APPROVED'
                                      ? 'bg-[#C6F36B]/15 text-[#C6F36B] border border-[#C6F36B]/30'
                                      : req.status === 'REJECTED'
                                      ? 'bg-[#FF7777]/15 text-[#FF7777] border border-[#FF7777]/30'
                                      : 'bg-[#F0BC65]/15 text-[#F0BC65] border border-[#F0BC65]/30'
                                  }`}
                                >
                                  {req.status === 'APPROVED' ? (
                                    <Check className="w-3 h-3" />
                                  ) : req.status === 'REJECTED' ? (
                                    <XCircle className="w-3 h-3" />
                                  ) : (
                                    <Clock className="w-3 h-3" />
                                  )}
                                  {req.status}
                                </span>
                                {req.reviewNotes && (
                                  <span
                                    className="block text-[10px] text-[#A0A89F] mt-1 max-w-[200px] truncate"
                                    title={req.reviewNotes}
                                  >
                                    Note: {req.reviewNotes}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right">
                                {req.status === 'PENDING' ? (
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => handleReviewRequest(req.id, 'APPROVE')}
                                      disabled={isReviewing}
                                      className="px-2.5 py-1 rounded-lg bg-[#C6F36B] hover:bg-[#b5e855] disabled:opacity-50 text-[#101211] font-bold text-xs flex items-center gap-1 shadow-sm transition-all"
                                    >
                                      {isReviewing ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <Check className="w-3 h-3" />
                                      )}
                                      Approve
                                    </button>

                                    <button
                                      onClick={() => {
                                        setRejectModalTarget(req);
                                        setRejectReason('');
                                      }}
                                      disabled={isReviewing}
                                      className="px-2.5 py-1 rounded-lg bg-[#FF7777]/15 hover:bg-[#FF7777]/25 border border-[#FF7777]/30 text-[#FF7777] font-bold text-xs flex items-center gap-1 transition-all"
                                    >
                                      <X className="w-3 h-3" />
                                      Reject
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-[#A0A89F]">
                                    Reviewed on{' '}
                                    {req.reviewedAt
                                      ? new Date(req.reviewedAt).toLocaleDateString()
                                      : 'N/A'}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Active Enrollments */}
          {activeTab === 'active' && (
            <div className="space-y-4">
              {/* Filter Bar */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[#171B18] border border-[#303831]">
                <Filter className="w-4 h-4 text-[#A0A89F] ml-1" />
                <span className="text-xs font-semibold text-[#A0A89F]">Filter by Course:</span>
                <select
                  value={selectedSubjectFilter}
                  onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-[#202622] border border-[#303831] text-xs text-[#F1F3ED] focus:outline-none focus:border-[#C6F36B]"
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
              <div className="rounded-2xl bg-[#171B18] border border-[#303831] overflow-hidden shadow-xl">
                {loading ? (
                  <div className="p-8 space-y-3">
                    <div className="flex items-center justify-center gap-2 py-4 text-xs text-[#A0A89F]">
                      <Loader2 className="w-4 h-4 animate-spin text-[#C6F36B]" />
                      <span>Loading course enrollments...</span>
                    </div>
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="h-12 bg-[#202622]/60 rounded-xl border border-[#303831]/40 animate-pulse"
                      />
                    ))}
                  </div>
                ) : enrollments.length === 0 ? (
                  <div className="p-12 text-center text-[#A0A89F]">
                    <p className="text-sm font-semibold text-[#F1F3ED]">
                      No active enrollments recorded
                    </p>
                    <p className="text-xs text-[#A0A89F] mt-1">
                      Approve pending student requests or directly enroll students using the buttons above.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#101211]/80 text-[#A0A89F] font-semibold uppercase tracking-wider border-b border-[#303831]">
                        <tr>
                          <th className="py-3 px-4">Student Roll</th>
                          <th className="py-3 px-4">Student Name</th>
                          <th className="py-3 px-4">Course Subject</th>
                          <th className="py-3 px-4">Faculty Instructor</th>
                          <th className="py-3 px-4">Enrolled On</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#303831]/60 text-[#F1F3ED]">
                        {enrollments.map((enr) => (
                          <tr key={enr.id} className="hover:bg-[#202622]/50 transition-colors">
                            <td className="py-3.5 px-4 font-mono font-bold text-[#C6F36B]">
                              {enr.student.rollNumber}
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-[#F1F3ED]">
                              {enr.student.name}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="font-mono text-[#C6F36B] mr-1.5">
                                {enr.subject.code}
                              </span>
                              <span className="text-[#F1F3ED]">{enr.subject.name}</span>
                            </td>
                            <td className="py-3.5 px-4 text-[#A0A89F]">
                              {enr.subject.faculty?.name || 'Assigned Instructor'}
                            </td>
                            <td className="py-3.5 px-4 text-[#A0A89F]">
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
                                className="p-1.5 rounded-lg text-[#A0A89F] hover:text-[#FF7777] hover:bg-[#FF7777]/10 transition-colors"
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
            </div>
          )}

          {/* Modal: Enroll Single Student */}
          {showModal && (
            <div className="fixed inset-0 z-50 bg-[#101211]/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-md rounded-2xl bg-[#171B18] border border-[#303831] p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-[#F1F3ED]">Direct Student Course Enrollment</h3>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-[#A0A89F] hover:text-[#F1F3ED]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-xs text-[#A0A89F] mb-5">
                  Immediately assigns student to course roster without requiring an enrollment request.
                </p>

                <form onSubmit={handleEnroll} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-[#A0A89F] mb-1">
                      Select Student
                    </label>
                    <select
                      value={formData.studentId}
                      onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                      required
                      className="w-full px-3 py-2 rounded-xl bg-[#202622] border border-[#303831] text-xs text-[#F1F3ED] focus:outline-none focus:border-[#C6F36B] font-mono"
                    >
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.rollNumber} — {s.name} ({s.department})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#A0A89F] mb-1">
                      Select Course Subject
                    </label>
                    <select
                      value={formData.subjectId}
                      onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                      required
                      className="w-full px-3 py-2 rounded-xl bg-[#202622] border border-[#303831] text-xs text-[#F1F3ED] focus:outline-none focus:border-[#C6F36B]"
                    >
                      {subjects.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.code} — {sub.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#303831]">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 rounded-xl bg-[#202622] hover:bg-[#303831] text-[#A0A89F] text-xs font-semibold transition-colors border border-[#303831]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-2 rounded-xl bg-[#C6F36B] hover:bg-[#b5e855] disabled:opacity-50 text-[#101211] text-xs font-bold transition-all shadow-md shadow-[#C6F36B]/20"
                    >
                      {submitting ? 'Enrolling...' : 'Confirm Enrollment'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal: Reject Request With Explanation */}
          {rejectModalTarget && (
            <div className="fixed inset-0 z-50 bg-[#101211]/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-md rounded-2xl bg-[#171B18] border border-[#303831] p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-[#F1F3ED]">Reject Course Request</h3>
                  <button
                    onClick={() => setRejectModalTarget(null)}
                    className="text-[#A0A89F] hover:text-[#F1F3ED]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-xs text-[#A0A89F] mb-4">
                  Rejecting enrollment for student{' '}
                  <span className="font-bold text-[#F1F3ED]">
                    {rejectModalTarget.student.rollNumber}
                  </span>{' '}
                  in{' '}
                  <span className="font-bold text-[#C6F36B]">{rejectModalTarget.subject.code}</span>.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-[#A0A89F] mb-1">
                      Reason / Administrative Note (Optional)
                    </label>
                    <textarea
                      placeholder="e.g. Prerequisite requirements not satisfied, or course section capacity reached."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 rounded-xl bg-[#202622] border border-[#303831] text-xs text-[#F1F3ED] placeholder-[#A0A89F] focus:outline-none focus:border-[#FF7777] resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#303831]">
                    <button
                      type="button"
                      onClick={() => setRejectModalTarget(null)}
                      className="px-4 py-2 rounded-xl bg-[#202622] hover:bg-[#303831] text-[#A0A89F] text-xs font-semibold transition-colors border border-[#303831]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleReviewRequest(rejectModalTarget.id, 'REJECT', rejectReason)
                      }
                      disabled={reviewingId === rejectModalTarget.id}
                      className="px-4 py-2 rounded-xl bg-[#FF7777] hover:bg-[#FF7777]/90 disabled:opacity-50 text-[#101211] text-xs font-bold transition-all shadow-md shadow-[#FF7777]/20"
                    >
                      {reviewingId === rejectModalTarget.id ? 'Rejecting...' : 'Confirm Rejection'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modal: Bulk CSV Import */}
          {showImportModal && (
            <div className="fixed inset-0 z-50 bg-[#101211]/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-lg rounded-2xl bg-[#171B18] border border-[#303831] p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-[#F1F3ED] flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-[#C6F36B]" />
                    Bulk Course Enrollment via CSV
                  </h3>
                  <button
                    onClick={() => setShowImportModal(false)}
                    className="text-[#A0A89F] hover:text-[#F1F3ED]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-xs text-[#A0A89F] mb-4">
                  Paste comma-separated rows with format:{' '}
                  <code className="text-[#C6F36B] bg-[#202622] px-1.5 py-0.5 rounded font-mono border border-[#303831]">
                    rollNumber,subjectCode
                  </code>
                </p>

                <form onSubmit={handleImportCsv} className="space-y-4">
                  <div>
                    <textarea
                      rows={6}
                      value={csvInput}
                      onChange={(e) => setCsvInput(e.target.value)}
                      required
                      placeholder={`rollNumber,subjectCode\nURK23CS1001,CS301\nURK23CS1002,CS301\nURK23CS1003,CS302`}
                      className="w-full p-3 rounded-xl bg-[#202622] border border-[#303831] text-xs text-[#F1F3ED] placeholder-[#A0A89F] font-mono focus:outline-none focus:border-[#C6F36B]"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#303831]">
                    <button
                      type="button"
                      onClick={() => setShowImportModal(false)}
                      className="px-4 py-2 rounded-xl bg-[#202622] hover:bg-[#303831] text-[#A0A89F] text-xs font-semibold transition-colors border border-[#303831]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={importing}
                      className="px-4 py-2 rounded-xl bg-[#C6F36B] hover:bg-[#b5e855] disabled:opacity-50 text-[#101211] text-xs font-bold transition-all shadow-md shadow-[#C6F36B]/20"
                    >
                      {importing ? 'Processing CSV...' : 'Import Enrollments'}
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
