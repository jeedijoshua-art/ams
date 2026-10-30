'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { Role } from '@prisma/client';
import {
  BookOpen,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Plus,
  Loader2,
  ArrowRight,
  User,
  Users,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';

interface Course {
  id: string;
  code: string;
  name: string;
  faculty: {
    id: string;
    name: string;
    department: string;
    employeeId: string;
  };
  enrolledCount: number;
  sessionsCount: number;
  isEnrolled: boolean;
  enrolledAt: string | null;
  request: {
    id: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
    requestedAt: string;
    reviewedAt: string | null;
    reviewNotes: string | null;
  } | null;
}

export default function StudentCoursesRegistrationPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'enrolled' | 'pending' | 'available'>('all');
  const [submittingCourseId, setSubmittingCourseId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const fetchCourses = async () => {
    try {
      const res = await fetch('/api/student/courses');
      const data = await res.json();
      if (data.courses) {
        setCourses(data.courses);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleRequestEnrollment = async (subjectId: string, courseCode: string) => {
    setSubmittingCourseId(subjectId);
    setFeedback(null);

    try {
      const res = await fetch('/api/student/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setFeedback({
          type: 'success',
          text: `Enrollment request for ${courseCode} submitted successfully. Pending administrator approval.`,
        });
        // Optimistic UI update
        setCourses((prev) =>
          prev.map((c) =>
            c.id === subjectId
              ? {
                  ...c,
                  request: {
                    id: data.request.id,
                    status: 'PENDING',
                    requestedAt: data.request.requestedAt,
                    reviewedAt: null,
                    reviewNotes: null,
                  },
                }
              : c
          )
        );
      } else {
        setFeedback({
          type: 'error',
          text: data.error || 'Failed to submit enrollment request.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Network error occurred.',
      });
    } finally {
      setSubmittingCourseId(null);
    }
  };

  const handleCancelRequest = async (subjectId: string, courseCode: string) => {
    if (!confirm(`Are you sure you want to cancel your enrollment request for ${courseCode}?`)) {
      return;
    }

    setSubmittingCourseId(subjectId);
    setFeedback(null);

    try {
      const res = await fetch(`/api/student/courses?subjectId=${subjectId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setFeedback({
          type: 'success',
          text: `Enrollment request for ${courseCode} cancelled.`,
        });
        // Immediate optimistic UI response
        setCourses((prev) =>
          prev.map((c) => (c.id === subjectId ? { ...c, request: null } : c))
        );
      } else {
        setFeedback({
          type: 'error',
          text: data.error || 'Failed to cancel request.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Network error occurred.',
      });
    } finally {
      setSubmittingCourseId(null);
    }
  };

  const filteredCourses = courses.filter((c) => {
    const matchesSearch =
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.faculty.name.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (filterTab === 'enrolled') return c.isEnrolled;
    if (filterTab === 'pending') return c.request?.status === 'PENDING';
    if (filterTab === 'available') return !c.isEnrolled && c.request?.status !== 'PENDING';

    return true;
  });

  const enrolledCount = courses.filter((c) => c.isEnrolled).length;
  const pendingCount = courses.filter((c) => c.request?.status === 'PENDING').length;

  return (
    <div className="min-h-screen bg-[#101211] text-[#F1F3ED] flex flex-col">
      <Navbar />

      <div className="flex-1 flex max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 gap-8">
        <Sidebar role={Role.STUDENT} />

        <main className="flex-1 min-w-0 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#303831]">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Link href="/student" className="text-[#A0A89F] hover:text-[#F1F3ED] transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                </Link>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-[#202622] text-[#C6F36B] border border-[#303831]">
                  Academic Catalog
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#F1F3ED] tracking-tight flex items-center gap-2.5">
                <BookOpen className="w-7 h-7 text-[#C6F36B]" />
                Course Registration Portal
              </h1>
              <p className="text-xs sm:text-sm text-[#A0A89F] mt-1">
                Explore accredited curriculum offerings, request course enrollment, and track approval status.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-lg bg-[#171B18] border border-[#303831] text-xs font-medium text-[#A0A89F]">
                Enrolled:{' '}
                <span className="font-bold text-[#C6F36B]">{enrolledCount}</span>
              </span>
              {pendingCount > 0 && (
                <span className="px-3 py-1.5 rounded-lg bg-[#F0BC65]/10 border border-[#F0BC65]/30 text-xs font-medium text-[#F0BC65]">
                  Pending Approval:{' '}
                  <span className="font-bold text-[#F0BC65]">{pendingCount}</span>
                </span>
              )}
            </div>
          </div>

          {/* Feedback Banner */}
          {feedback && (
            <div
              className={`p-4 rounded-xl flex items-center gap-3 border transition-all ${
                feedback.type === 'success'
                  ? 'bg-[#72D6A0]/10 border-[#72D6A0]/40 text-[#72D6A0]'
                  : 'bg-[#FF7777]/10 border-[#FF7777]/40 text-[#FF7777]'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-[#72D6A0] shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-[#FF7777] shrink-0" />
              )}
              <span className="text-xs font-medium">{feedback.text}</span>
            </div>
          )}

          {/* Search & Tabs Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[#A0A89F] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search courses by code, title, or instructor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#171B18] border border-[#303831] text-xs text-[#F1F3ED] placeholder-[#A0A89F]/60 focus:outline-none focus:border-[#C6F36B] transition-colors"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#171B18] border border-[#303831] text-xs overflow-x-auto">
              <button
                onClick={() => setFilterTab('all')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  filterTab === 'all'
                    ? 'bg-[#C6F36B] text-[#101211] font-bold shadow-sm'
                    : 'text-[#A0A89F] hover:text-[#F1F3ED]'
                }`}
              >
                All ({courses.length})
              </button>
              <button
                onClick={() => setFilterTab('enrolled')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  filterTab === 'enrolled'
                    ? 'bg-[#C6F36B] text-[#101211] font-bold shadow-sm'
                    : 'text-[#A0A89F] hover:text-[#F1F3ED]'
                }`}
              >
                Enrolled ({enrolledCount})
              </button>
              <button
                onClick={() => setFilterTab('pending')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  filterTab === 'pending'
                    ? 'bg-[#C6F36B] text-[#101211] font-bold shadow-sm'
                    : 'text-[#A0A89F] hover:text-[#F1F3ED]'
                }`}
              >
                Pending ({pendingCount})
              </button>
              <button
                onClick={() => setFilterTab('available')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  filterTab === 'available'
                    ? 'bg-[#C6F36B] text-[#101211] font-bold shadow-sm'
                    : 'text-[#A0A89F] hover:text-[#F1F3ED]'
                }`}
              >
                Available
              </button>
            </div>
          </div>

          {/* Courses Grid */}
          {loading ? (
            <div className="p-16 text-center text-[#A0A89F]">
              <Loader2 className="w-8 h-8 animate-spin text-[#C6F36B] mx-auto mb-2" />
              <p className="text-xs">Loading course catalog...</p>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="p-12 text-center rounded-xl bg-[#171B18] border border-[#303831] space-y-3">
              <BookOpen className="w-10 h-10 text-[#303831] mx-auto" />
              <h3 className="text-sm font-bold text-[#F1F3ED]">No Courses Found</h3>
              <p className="text-xs text-[#A0A89F] max-w-sm mx-auto">
                No academic courses match your search criteria. Try modifying your filter or search query.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredCourses.map((course) => {
                const isPending = course.request?.status === 'PENDING';
                const isRejected = course.request?.status === 'REJECTED';
                const isSubmitting = submittingCourseId === course.id;

                return (
                  <div
                    key={course.id}
                    className={`p-6 rounded-xl bg-[#171B18] border transition-all flex flex-col justify-between ${
                      course.isEnrolled
                        ? 'border-[#C6F36B]/40'
                        : isPending
                        ? 'border-[#F0BC65]/40'
                        : 'border-[#303831] hover:border-[#424D43]'
                    }`}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-[#202622] text-[#C6F36B] border border-[#303831]">
                          {course.code}
                        </span>

                        {course.isEnrolled ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#72D6A0]/15 text-[#72D6A0] border border-[#72D6A0]/30">
                            <CheckCircle2 className="w-3 h-3" />
                            Enrolled
                          </span>
                        ) : isPending ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#F0BC65]/15 text-[#F0BC65] border border-[#F0BC65]/30">
                            <Clock className="w-3 h-3" />
                            Pending Admin Approval
                          </span>
                        ) : isRejected ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#FF7777]/15 text-[#FF7777] border border-[#FF7777]/30">
                            <XCircle className="w-3 h-3" />
                            Request Rejected
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-[#A0A89F]">
                            Open for Enrollment
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-[#F1F3ED]">{course.name}</h3>

                      <div className="mt-3 space-y-1.5 text-xs text-[#A0A89F]">
                        <p className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-[#A0A89F]" />
                          Instructor:{' '}
                          <span className="font-medium text-[#F1F3ED]">
                            {course.faculty.name}
                          </span>{' '}
                          ({course.faculty.department})
                        </p>
                        <p className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-[#A0A89F]" />
                          <span>
                            {course.enrolledCount} active students enrolled • {course.sessionsCount} sessions
                          </span>
                        </p>
                      </div>

                      {/* Review Note if Rejected */}
                      {isRejected && course.request?.reviewNotes && (
                        <div className="mt-3 p-3 rounded-xl bg-[#FF7777]/10 border border-[#FF7777]/20 text-xs text-[#FF7777]">
                          <span className="font-semibold block text-[#F1F3ED]">Rejection Note:</span>
                          {course.request.reviewNotes}
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="pt-5 mt-4 border-t border-[#303831] flex items-center justify-between">
                      {course.isEnrolled ? (
                        <Link
                          href="/student"
                          className="text-xs font-semibold text-[#C6F36B] hover:text-[#b5e855] flex items-center gap-1"
                        >
                          View Subject Attendance <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      ) : isPending ? (
                        <div className="w-full flex items-center justify-between">
                          <span className="text-[11px] text-[#A0A89F]">
                            Submitted on {new Date(course.request!.requestedAt).toLocaleDateString()}
                          </span>
                          <button
                            onClick={() => handleCancelRequest(course.id, course.code)}
                            disabled={isSubmitting}
                            className="px-3 py-1.5 rounded-lg bg-[#202622] hover:bg-[#FF7777]/20 hover:text-[#FF7777] text-xs text-[#A0A89F] border border-[#303831] transition-colors"
                          >
                            {isSubmitting ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              'Cancel Request'
                            )}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleRequestEnrollment(course.id, course.code)}
                          disabled={isSubmitting}
                          className="w-full py-2.5 rounded-xl bg-[#C6F36B] hover:bg-[#b5e855] disabled:opacity-50 text-[#101211] font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-[#C6F36B]/20"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Submitting Request...
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4" />
                              Request Enrollment
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
