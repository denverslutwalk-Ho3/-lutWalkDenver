import { getAdminStorage } from './firebase-admin';

/** Delete a Firebase Storage object before its Firestore metadata is removed. */
export async function deleteStorageObject(storagePath: unknown): Promise<void> {
  if (typeof storagePath !== 'string' || !storagePath.trim()) return;

  await getAdminStorage().bucket().file(storagePath.trim()).delete({ ignoreNotFound: true });
}
