import { cookies } from 'next/headers';
import { prisma } from './prisma';

export interface AuthUser {
  id: string;
  studentId: string;
  email: string;
  name: string;
  role: 'STUDENT' | 'ADMIN' | 'AUDITOR';
  department: string;
  year?: number | null;
}

const COOKIE_NAME = 'cv_session_user';

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = cookies();
  const userId = cookieStore.get(COOKIE_NAME)?.value;

  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (user && user.status === 'ACTIVE') {
      return user as AuthUser;
    }
  }

  // Strict security: return null if unauthenticated
  return null;
}

export async function getAllDemoUsers(): Promise<AuthUser[]> {
  const users = await prisma.user.findMany({
    orderBy: { role: 'asc' },
  });
  return users as AuthUser[];
}
