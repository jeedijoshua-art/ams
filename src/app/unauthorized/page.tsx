import React from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft, Home, UserX, AlertOctagon, HelpCircle } from 'lucide-react';

interface UnauthorizedProps {
  searchParams: Promise<{ reason?: string }>;
}

export default async function UnauthorizedPage({ searchParams }: UnauthorizedProps) {
  const params = await searchParams;
  const reason = params?.reason || '';

  let title = 'Access Denied';
  let description = 'You do not have the required permissions to access this institutional resource.';
  let icon = <ShieldAlert className="w-8 h-8 text-rose-400" />;

  if (reason === 'unrecognized_student') {
    title = 'Unrecognized Student Account';
    description =
      'Your verified Google account does not match any approved student enrollment record in the AMS database. Institutional access is restricted to pre-registered students. Please contact your Academic Administrator or Department Coordinator with your Roll Number to be added to the portal.';
    icon = <UserX className="w-8 h-8 text-amber-400" />;
  } else if (reason === 'unrecognized_faculty') {
    title = 'Unrecognized Faculty Account';
    description =
      'No active faculty record was found matching your credentials. Faculty accounts must be provisioned and assigned classes by the Academic Administrator.';
    icon = <AlertOctagon className="w-8 h-8 text-rose-400" />;
  } else if (reason === 'account_deactivated') {
    title = 'Account Suspended or Deactivated';
    description =
      'Your user profile has been marked as inactive by the administration. Please reach out to the College Administration to reactivate your credentials.';
    icon = <AlertOctagon className="w-8 h-8 text-rose-400" />;
  } else if (reason === 'admin_required') {
    title = 'Administrator Privilege Required';
    description =
      'The requested page is restricted strictly to authorized system administrators. Server-side role checks rejected your request.';
    icon = <ShieldAlert className="w-8 h-8 text-rose-400" />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-6 shadow-2xl">
        {icon}
      </div>

      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold mb-4">
        Zero-Trust Institutional Security
      </div>

      <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white max-w-xl">
        {title}
      </h1>

      <p className="mt-4 text-sm sm:text-base text-slate-400 max-w-lg leading-relaxed">
        {description}
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-all shadow-md"
        >
          <Home className="w-4 h-4" />
          Return to Portal Home
        </Link>
        <Link
          href="/sign-in"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-500 text-slate-950 text-sm font-bold hover:bg-teal-400 transition-all shadow-lg shadow-teal-500/20"
        >
          Sign In with Different Account
        </Link>
      </div>

      <div className="mt-12 text-xs text-slate-500 max-w-md border-t border-slate-900 pt-6">
        <p>AMS — Smart Attendance Management System • Security Gateway</p>
        <p className="mt-1">For support, email: registrar@karunya.edu or visit the Administration Block.</p>
      </div>
    </div>
  );
}
