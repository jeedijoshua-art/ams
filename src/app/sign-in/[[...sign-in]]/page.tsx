import React from 'react';
import { isClerkConfigured } from '@/lib/auth';
import DemoLoginPage from '@/app/demo-login/page';
import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  const clerkEnabled = isClerkConfigured();

  if (!clerkEnabled) {
    return <DemoLoginPage />;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <SignIn routing="path" path="/sign-in" />
    </div>
  );
}
