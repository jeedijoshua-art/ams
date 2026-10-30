import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { auth } from '@/auth';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

export default async function DashboardRedirectPage() {
  const user = await getCurrentUser();

  if (!user) {
    const session = await auth();
    console.warn('[AUTH-DIAGNOSTIC] Decision Point 5 Rejection:', {
      hasAuthSession: Boolean(session?.user),
      rejectionReasonCode: session?.user ? 'unrecognized_student' : 'no_session',
    });
    if (session?.user) {
      redirect('/unauthorized?reason=unrecognized_student');
    }
    redirect('/sign-in');
  }

  if (user.role === Role.ADMIN) {
    redirect('/bosshere');
  } else if (user.role === Role.FACULTY) {
    redirect('/faculty');
  } else {
    redirect('/student');
  }
}
