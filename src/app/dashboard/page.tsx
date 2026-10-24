import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

export default async function DashboardRedirectPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/demo-login');
  }

  if (user.role === Role.ADMIN) {
    redirect('/admin');
  } else if (user.role === Role.FACULTY) {
    redirect('/faculty');
  } else {
    redirect('/student');
  }
}
