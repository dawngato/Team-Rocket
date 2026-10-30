import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'ADMIN' && user.role !== 'AUDITOR')) {
      return NextResponse.json({ error: 'Administrative or Auditor access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const electionId = searchParams.get('electionId');

    const where: any = {};
    if (electionId) where.electionId = electionId;

    const events = await prisma.auditEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: {
          select: { name: true, studentId: true, role: true },
        },
      },
    });

    return NextResponse.json({ events });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
