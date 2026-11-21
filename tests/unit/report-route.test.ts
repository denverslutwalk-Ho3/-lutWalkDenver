import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireMemberOrAdmin: vi.fn(),
  requireAdmin: vi.fn(),
  getAdminDb: vi.fn(),
}));

vi.mock('../../lib/authz', () => ({
  requireMemberOrAdmin: mocks.requireMemberOrAdmin,
  requireAdmin: mocks.requireAdmin,
}));
vi.mock('../../lib/firebase-admin', () => ({
  getAdminDb: mocks.getAdminDb,
}));
vi.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: () => 'SERVER_TIMESTAMP' },
}));

import { POST } from '../../app/api/reports/route';

describe('POST /api/reports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireMemberOrAdmin.mockResolvedValue({ role: 'member', claims: {} });
  });

  it('stores a private post report with server-assigned role and accepted reasons', async () => {
    const reportRef = {
      id: 'report-1',
      set: vi.fn().mockResolvedValue(undefined),
      collection: () => ({
        doc: () => ({ set: vi.fn().mockResolvedValue(undefined) }),
      }),
    };
    mocks.getAdminDb.mockReturnValue({
      collection: (name: string) => {
        if (name === 'posts') {
          return { doc: () => ({ get: vi.fn().mockResolvedValue({ exists: true }) }) };
        }
        return { doc: () => reportRef };
      },
    });

    const response = await POST(new Request('http://localhost/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetType: 'post',
        targetId: 'post-1',
        reason: 'harassment',
        details: 'Repeated targeted abuse',
      }),
    }));

    expect(response.status).toBe(201);
    expect(reportRef.set).toHaveBeenCalledWith(expect.objectContaining({
      status: 'open',
      reporterRole: 'member',
      reason: 'harassment',
    }));
  });

  it('rejects invalid reasons', async () => {
    mocks.getAdminDb.mockReturnValue({});
    const response = await POST(new Request('http://localhost/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetType: 'post',
        targetId: 'post-1',
        reason: 'made-up-reason',
      }),
    }));
    expect(response.status).toBe(400);
  });
});
