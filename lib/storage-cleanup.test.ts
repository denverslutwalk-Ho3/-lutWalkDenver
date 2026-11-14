import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./firebase-admin', () => ({ getAdminStorage: vi.fn() }));

import { getAdminStorage } from './firebase-admin';
import { deleteStorageObject } from './storage-cleanup';

describe('deleteStorageObject', () => {
  beforeEach(() => {
    vi.mocked(getAdminStorage).mockReset();
  });

  it('propagates Storage errors so callers can retain the metadata for retry', async () => {
    const error = new Error('Storage unavailable');
    vi.mocked(getAdminStorage).mockImplementation(() => {
      throw error;
    });

    await expect(deleteStorageObject('posts/image.jpg')).rejects.toBe(error);
  });

  it('does nothing when no Storage path is present', async () => {
    await deleteStorageObject(undefined);
    expect(getAdminStorage).not.toHaveBeenCalled();
  });
});
