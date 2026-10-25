import { redirect } from 'next/navigation';
import { getCurrentUser, isClerkConfigured } from '@/lib/auth';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

export default async function DashboardRedirectPage() {
  const user = await getCurrentUser();

  if (!user) {
    if (isClerkConfigured()) {
      try {
        const { auth } = await import('@clerk/nextjs/server');
        const session = await auth();
        if (session?.userId) {
          // User authenticated with Clerk (e.g. Google), but not enrolled/approved in AMS database!
          redirect('/unauthorized?reason=unrecognized_student');
        }
      } catch (err) {
        console.error('Error checking clerk session in dashboard redirect:', err);
      }
    }
    redirect('/sign-in');
  }

  if (user.role === Role.ADMIN) {
    redirect('/admin');
  } else if (user.role === Role.FACULTY) {
    redirect('/faculty');
  } else {
    redirect('/student');
  }
}
