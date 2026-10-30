import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { Role } from '@prisma/client';
import BossLoginForm from './BossLoginForm';

export const dynamic = 'force-dynamic';

export default async function BossLoginPage() {
  const user = await getCurrentUser();

  // If already authenticated as administrator, redirect to boss dashboard immediately
  if (user && user.role === Role.ADMIN) {
    redirect('/bosshere');
  }

  return <BossLoginForm />;
}
