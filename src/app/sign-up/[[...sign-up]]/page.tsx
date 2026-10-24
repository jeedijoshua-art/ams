import React from 'react';
import { isClerkConfigured } from '@/lib/auth';
import DemoLoginPage from '@/app/demo-login/page';
import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  const clerkEnabled = isClerkConfigured();

  if (!clerkEnabled) {
    return <DemoLoginPage />;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <SignUp routing="path" path="/sign-up" />
    </div>
  );
}
