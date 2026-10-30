import React from 'react';
import Link from 'next/link';
import { ShieldAlert, Home, UserX, AlertOctagon } from 'lucide-react';

interface UnauthorizedProps {
  searchParams: Promise<{ reason?: string }>;
}

export default async function UnauthorizedPage({ searchParams }: UnauthorizedProps) {
  const params = await searchParams;
  const reason = params?.reason || '';

  let title = 'Access Denied';
  let description =
    'You do not have the required permissions to access this institutional resource.';
  let icon = <ShieldAlert className="w-8 h-8 text-[#FF7777]" />;

  if (reason === 'unrecognized_student') {
    title = 'Unrecognized Student Account';
    description =
      'Your verified Google account does not match any approved student enrollment record in the AMS database. Institutional access is restricted to pre-registered students. Please contact your Academic Administrator or Department Coordinator with your Roll Number to be added to the portal.';
    icon = <UserX className="w-8 h-8 text-[#F0BC65]" />;
  } else if (reason === 'unrecognized_faculty') {
    title = 'Unrecognized Faculty Account';
    description =
      'No active faculty record was found matching your credentials. Faculty accounts must be provisioned and assigned classes by the Academic Administrator.';
    icon = <AlertOctagon className="w-8 h-8 text-[#FF7777]" />;
  } else if (reason === 'account_deactivated') {
    title = 'Account Suspended or Deactivated';
    description =
      'Your user profile has been marked as inactive by the administration. Please reach out to the College Administration to reactivate your credentials.';
    icon = <AlertOctagon className="w-8 h-8 text-[#FF7777]" />;
  } else if (reason === 'unverified_email') {
    title = 'Unverified Email Address';
    description =
      'Your Google account does not have a verified email claim. AMS security policy requires verified institutional identities to access the student portal.';
    icon = <AlertOctagon className="w-8 h-8 text-[#FF7777]" />;
  } else if (reason === 'admin_required') {
    title = 'Administrator Privilege Required';
    description =
      'The requested page is restricted strictly to authorized system administrators. Server-side role checks rejected your request.';
    icon = <ShieldAlert className="w-8 h-8 text-[#FF7777]" />;
  }

  return (
    <div className="min-h-screen bg-[#101211] text-[#F1F3ED] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-xl bg-[#171B18] border border-[#303831] flex items-center justify-center mb-6 shadow-sm">
        {icon}
      </div>

      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF7777]/10 border border-[#FF7777]/20 text-[#FF7777] text-xs font-semibold mb-4">
        Zero-Trust Institutional Security
      </div>

      <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#F1F3ED] max-w-xl">
        {title}
      </h1>

      <p className="mt-3 text-xs sm:text-sm text-[#A0A89F] max-w-lg leading-relaxed">
        {description}
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#171B18] border border-[#303831] text-xs font-semibold text-[#A0A89F] hover:text-[#F1F3ED] hover:bg-[#202622] transition-all shadow-sm"
        >
          <Home className="w-4 h-4" />
          Return to Portal Home
        </Link>
        <Link
          href="/sign-in"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C6F36B] hover:bg-[#D4FF83] text-[#101211] text-xs font-bold transition-all shadow-sm"
        >
          Sign In with Different Account
        </Link>
      </div>

      <div className="mt-12 text-[11px] text-[#737E75] max-w-md border-t border-[#303831] pt-6">
        <p>AMS — Smart Attendance Management System • Security Gateway</p>
        <p className="mt-1">For support, email: registrar@karunya.edu or visit the Administration Block.</p>
      </div>
    </div>
  );
}
