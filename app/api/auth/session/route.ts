import { NextResponse } from 'next/server';
import { getServerSession } from '../../../../lib/authz';
import { isAdminLoginConfigured, isMemberLoginConfigured } from '../../../../lib/passwords';

export async function GET() {
  const session = await getServerSession();
  return NextResponse.json({
    role: session?.role ?? null,
    memberLoginConfigured: isMemberLoginConfigured(),
    adminLoginConfigured: isAdminLoginConfigured(),
  });
}
