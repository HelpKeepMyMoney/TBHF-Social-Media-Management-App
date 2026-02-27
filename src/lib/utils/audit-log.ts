import { getAdminFirestore } from '@/lib/firebase/admin';
import type { AuditAction, AuditLogEntry } from '@/types';

export async function writeAuditLog(
  userId: string,
  action: AuditAction,
  resourceId?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    const db = getAdminFirestore();
    const entry: Omit<AuditLogEntry, 'id'> = {
      userId,
      action,
      resourceId,
      metadata,
      createdAt: new Date().toISOString(),
    };
    await db.collection('audit_logs').add(entry);
  } catch (err) {
    // Audit log failures must never break the main request
    console.error('[audit-log] Failed to write log entry:', err);
  }
}
