'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { formatDate } from '@/lib/utils';
import {
  collection,
  getDocs,
  orderBy,
  query,
} from 'firebase/firestore';
import { getClientFirestore } from '@/lib/firebase/client';
import {
  Shield,
  Users,
  Plus,
  FileText,
} from 'lucide-react';
import type { AppUser, AuditLogEntry } from '@/types';

export default function SettingsPage() {
  const { user, isAdmin } = useAuth();
  const { apiFetch }      = useApi();
  const toast             = useToast();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  // New user modal
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName,  setNewUserName]  = useState('');
  const [newUserRole,  setNewUserRole]  = useState<'admin' | 'staff' | 'board'>('staff');
  const [addingUser, setAddingUser]     = useState(false);

  // Audit logs (admin only)
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditLogsLoading, setAuditLogsLoading] = useState(false);

  useEffect(() => {
    async function loadUsers() {
      setLoading(true);
      try {
        const db   = getClientFirestore();
        const snap = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc')));
        setUsers(snap.docs.map((d) => ({ uid: d.id, ...d.data() }) as AppUser));
      } catch {
        toast('error', 'Failed to load users');
      } finally {
        setLoading(false);
      }
    }
    if (isAdmin) loadUsers();
    else setLoading(false);
  }, [isAdmin, toast]);

  useEffect(() => {
    async function loadAuditLogs() {
      if (!isAdmin) return;
      setAuditLogsLoading(true);
      try {
        const res = await apiFetch<AuditLogEntry[]>('/api/audit-logs?limit=50');
        if (res.success) setAuditLogs(res.data);
      } catch {
        toast('error', 'Failed to load audit logs');
      } finally {
        setAuditLogsLoading(false);
      }
    }
    loadAuditLogs();
  }, [isAdmin, apiFetch, toast]);

  if (loading) return <PageLoader />;

  if (!isAdmin) {
    return (
      <div className="max-w-2xl space-y-6">
        <h2 className="text-xl font-bold text-stone-900">Settings</h2>
        <div className="card p-6">
          <h3 className="section-heading mb-2">Your Profile</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-stone-500">Name</span>
              <span className="text-stone-800 font-medium">{user?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Email</span>
              <span className="text-stone-800">{user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Role</span>
              <Badge variant={user?.role === 'board' ? 'info' : user?.role === 'admin' ? 'warning' : 'default'}>
                {user?.role}
              </Badge>
            </div>
          </div>
        </div>
        <div className="card p-6 bg-amber-50 border-amber-200">
          <p className="text-sm text-amber-800">
            Contact your organization administrator to change your role or account settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* User management */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-stone-400" />
            <h3 className="section-heading">User Management</h3>
          </div>
          <Button
            size="sm"
            icon={<Plus className="h-3.5 w-3.5" />}
            onClick={() => setShowAddUser(true)}
          >
            Add User
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100">
                <th className="text-left font-medium text-stone-500 pb-2 pr-4">Name</th>
                <th className="text-left font-medium text-stone-500 pb-2 pr-4">Email</th>
                <th className="text-left font-medium text-stone-500 pb-2 pr-4">Role</th>
                <th className="text-left font-medium text-stone-500 pb-2">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {users.map((u) => (
                <tr key={u.uid} className="hover:bg-stone-50/50">
                  <td className="py-2.5 pr-4 font-medium text-stone-800">{u.name}</td>
                  <td className="py-2.5 pr-4 text-stone-600">{u.email}</td>
                  <td className="py-2.5 pr-4">
                    <Badge
                      variant={u.role === 'admin' ? 'warning' : u.role === 'board' ? 'info' : 'default'}
                    >
                      {u.role}
                    </Badge>
                  </td>
                  <td className="py-2.5 text-stone-400 text-xs">
                    {u.createdAt ? formatDate(u.createdAt) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit logs */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5 text-stone-400" />
          <h3 className="section-heading">Audit Log</h3>
        </div>
        <p className="text-sm text-stone-500 mb-4">
          Recent activity across campaigns, posts, AI usage, and exports.
        </p>
        {auditLogsLoading ? (
          <p className="text-sm text-stone-400">Loading…</p>
        ) : auditLogs.length === 0 ? (
          <p className="text-sm text-stone-400">No audit entries yet.</p>
        ) : (
          <div className="overflow-x-auto max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 sticky top-0 bg-white">
                  <th className="text-left font-medium text-stone-500 pb-2 pr-4">Time</th>
                  <th className="text-left font-medium text-stone-500 pb-2 pr-4">Action</th>
                  <th className="text-left font-medium text-stone-500 pb-2 pr-4">Resource</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-stone-50/50">
                    <td className="py-2 pr-4 text-stone-600 text-xs whitespace-nowrap">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="py-2 pr-4">
                      <code className="text-xs bg-stone-100 px-1.5 py-0.5 rounded">
                        {log.action}
                      </code>
                    </td>
                    <td className="py-2 text-stone-500 text-xs">
                      {log.resourceId ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Security info */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-stone-400" />
          <h3 className="section-heading">Security & Configuration</h3>
        </div>
        <div className="space-y-3 text-sm">
          {[
            { label: 'Authentication',    value: 'Firebase Auth (Email/Password)' },
            { label: 'Database',          value: 'Firestore with server-enforced security rules' },
            { label: 'AI API Keys',       value: 'Server-side only (never exposed to client)' },
            { label: 'Media Storage',     value: process.env.NEXT_PUBLIC_STORAGE_PROVIDER_LABEL ?? 'Configured via STORAGE_PROVIDER env var' },
            { label: 'Rate Limiting',     value: 'Per-user, per-minute (configurable via AI_RATE_LIMIT_RPM)' },
            { label: 'Audit Logging',     value: 'Enabled — all AI usage and data modifications are logged' },
          ].map((item) => (
            <div key={item.label} className="flex justify-between gap-4">
              <span className="text-stone-500 shrink-0">{item.label}</span>
              <span className="text-stone-700 text-right">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Add user modal */}
      <Modal
        open={showAddUser}
        onClose={() => setShowAddUser(false)}
        title="Add Team Member"
        description="Note: User must already exist in Firebase Authentication. This creates their Firestore profile."
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="label block mb-1.5">Full Name</label>
            <input
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              className="input-base"
              placeholder="Jane Smith"
            />
          </div>
          <div>
            <label className="label block mb-1.5">Email</label>
            <input
              type="email"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              className="input-base"
              placeholder="jane@organization.org"
            />
          </div>
          <div>
            <label className="label block mb-1.5">Role</label>
            <select
              value={newUserRole}
              onChange={(e) => setNewUserRole(e.target.value as typeof newUserRole)}
              className="input-base"
            >
              <option value="staff">Staff (create/edit content)</option>
              <option value="board">Board (read-only analytics)</option>
              <option value="admin">Admin (full access)</option>
            </select>
          </div>
          <p className="text-xs text-amber-700 bg-amber-50 rounded p-2">
            Admin role grants full system access including user management and deletion. Assign with care.
          </p>
          <div className="flex gap-3 pt-2">
            <Button
              loading={addingUser}
              onClick={async () => {
                if (!newUserEmail || !newUserName) {
                  toast('error', 'Name and email are required');
                  return;
                }
                setAddingUser(true);
                try {
                  const res = await apiFetch<AppUser>('/api/users', {
                    method: 'POST',
                    body:   JSON.stringify({ name: newUserName, email: newUserEmail, role: newUserRole }),
                  });
                  if (!res.success) throw new Error(res.error);
                  toast('success', 'User profile created');
                  setUsers((prev) => [res.data, ...prev]);
                  setShowAddUser(false);
                  setNewUserEmail(''); setNewUserName(''); setNewUserRole('staff');
                } catch (err) {
                  toast('error', err instanceof Error ? err.message : 'Failed to create user');
                } finally {
                  setAddingUser(false);
                }
              }}
            >
              Create User
            </Button>
            <Button variant="secondary" onClick={() => setShowAddUser(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
