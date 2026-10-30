import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { Role } from '@prisma/client';
import SignInContent from './SignInContent';
import { Suspense } from 'react';
import { AmsLoader } from '@/components/AmsLoader';

export const dynamic = 'force-dynamic';

export default async function SignInPage() {
  const user = await getCurrentUser();
  if (user) {
    if (user.role === Role.ADMIN) {
      redirect('/bosshere');
    }
    if (user.role === Role.FACULTY) {
      redirect('/faculty');
    }
    redirect('/student');
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#101211] flex items-center justify-center">
          <AmsLoader label="Securing authentication portal…" />
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
