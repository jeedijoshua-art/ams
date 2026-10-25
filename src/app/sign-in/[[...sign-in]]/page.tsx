import React from 'react';
import Link from 'next/link';
import { isClerkConfigured } from '@/lib/auth';
import DemoLoginPage from '@/app/demo-login/page';
import { SignIn } from '@clerk/nextjs';
import { GraduationCap, BookOpen, ShieldCheck, ArrowLeft } from 'lucide-react';

interface SignInPageProps {
  searchParams: Promise<{ role?: string; redirect_url?: string }>;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const role = params?.role || 'student';
  const clerkEnabled = isClerkConfigured();

  if (!clerkEnabled) {
    return <DemoLoginPage />;
  }

  const isStudent = role === 'student';

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative selection:bg-teal-500 selection:text-slate-950">
      {/* Subtle Background Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Institutional Top Bar */}
      <div className="w-full max-w-md mb-6 flex items-center justify-between z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Portal Home
        </Link>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-teal-400">
          Karunya AMS Portal
        </span>
      </div>

      {/* Role Context Card */}
      <div className="w-full max-w-md mb-6 p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-md z-10 text-left">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shrink-0">
            {isStudent ? (
              <GraduationCap className="w-5 h-5 text-teal-400" />
            ) : (
              <BookOpen className="w-5 h-5 text-indigo-400" />
            )}
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">
              {isStudent ? 'Student Authentication Gateway' : 'Faculty Access Gateway'}
            </h2>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {isStudent
                ? 'Sign in with your verified Google account. Only students pre-registered in the AMS database will be granted access.'
                : 'Faculty sign in using credentials provisioned by the Academic Administrator.'}
            </p>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span>Swapping roles?</span>
          <div className="flex items-center gap-2">
            <Link
              href="/sign-in?role=student"
              className={`font-semibold transition-colors ${
                isStudent ? 'text-teal-400' : 'hover:text-white'
              }`}
            >
              Student Login
            </Link>
            <span>•</span>
            <Link
              href="/sign-in?role=faculty"
              className={`font-semibold transition-colors ${
                !isStudent ? 'text-teal-400' : 'hover:text-white'
              }`}
            >
              Faculty Login
            </Link>
          </div>
        </div>
      </div>

      {/* Clerk Hosted / Embedded Component */}
      <div className="z-10 w-full max-w-md flex justify-center">
        <SignIn
          routing="path"
          path="/sign-in"
          fallbackRedirectUrl="/dashboard"
          appearance={{
            elements: {
              card: 'bg-slate-900/95 border border-slate-800 shadow-2xl rounded-2xl text-slate-100 backdrop-blur-md',
              headerTitle: 'text-white text-xl font-bold',
              headerSubtitle: 'text-slate-400 text-xs',
              socialButtonsBlockButton:
                'bg-slate-800 hover:bg-slate-700 border-slate-700 text-white font-medium transition-colors',
              formButtonPrimary:
                'bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold transition-all shadow-lg shadow-teal-500/20',
              formFieldInput:
                'bg-slate-950 border-slate-800 text-white focus:border-teal-500 focus:ring-teal-500/20',
              footerActionLink: 'text-teal-400 hover:text-teal-300 font-semibold',
            },
          }}
        />
      </div>
    </div>
  );
}
