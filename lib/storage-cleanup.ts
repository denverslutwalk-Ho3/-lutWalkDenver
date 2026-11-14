import { getAdminStorage } from './firebase-admin';

/**
 * Best-effort deletion of a Firebase Storage object. Storage failures are
 * logged but do not fail the caller, so removing metadata never blocks the
 * Firestore delete it accompanies.
 */
export async function deleteStorageObject(storagePath: unknown): Promise<void> {
  if (typeof storagePath !== 'string' || !storagePath.trim()) return;

  try {
    await getAdminStorage().bucket().file(storagePath.trim()).delete({ ignoreNotFound: true });
  } catch (err) {
    console.error('Failed to delete storage object:', err);
  }
}
