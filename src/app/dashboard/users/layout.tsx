import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function UsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session || session.user.role !== 'admin') {
    redirect('/dashboard');
  }

  return <>{children}</>;
} 