import { useEffect, useState } from 'react';
import { useAsync } from '../../hooks/useAsync';
import { userService } from '../../services';
import { PageHeader } from '../../components/PageHeader';
import { Modal } from '../../components/Modal';
import { Badge, Spinner } from '../../components/ui';
import { ROLE_LABELS, fmtDate } from '../../utils/format';
import { useToast } from '../../context/ToastContext';
import { errorMessage } from '../../utils/errors';

const EMPTY = { fullName: '', email: '', phone: '', password: '', role: 'RECEPTIONIST', shift: 'DAY' };

export default function AdminUsers() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const list = useAsync();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  const load = () => list.run(() => userService.list({ limit: 100, search: search || undefined }));
  useEffect(load, [search]);
  // eslint-disable-next-line react-hooks/exhaustive-deps

  const items = list.data?.items || [];

  const createUser = async () => {
    setBusy(true);
    try {
      await userService.create(form);
      toast.success('User created');
      setShowCreate(false);
      setForm(EMPTY);
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (u) => {
    setBusy(true);
    try {
      await userService.update(u._id, { isActive: !u.isActive });
      toast.success(u.isActive ? 'User disabled' : 'User enabled');
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Users & Staff"
        subtitle="Manage staff and admin accounts"
        actions={
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            Create user
          </button>
        }
      />

      <div className="mb-4">
        <input className="input max-w-sm" placeholder="Search by name or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {list.loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <div className="card py-12 text-center text-sm text-slate-400">No users found.</div>
      ) : (
        <div className="card overflow-hidden !p-0">
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50">
                    <td className="font-medium text-slate-800">{u.fullName}</td>
                    <td className="text-slate-500">{u.email}</td>
                    <td className="text-slate-500">{u.phone}</td>
                    <td>
                      <Badge color="bg-brand-50 text-brand-700">{ROLE_LABELS[u.role]}</Badge>
                    </td>
                    <td>
                      <Badge color={u.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}>
                        {u.isActive ? 'Active' : 'Disabled'}
                      </Badge>
                    </td>
                    <td className="text-slate-500">{fmtDate(u.createdAt)}</td>
                    <td className="text-right">
                      <button className="text-sm font-medium text-brand-600 hover:underline" onClick={() => toggleActive(u)} disabled={busy}>
                        {u.isActive ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create user">
        <div className="space-y-3">
          <div>
            <label className="label">Full name</label>
            <input className="input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div>
              <label className="label">Role</label>
              <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="RECEPTIONIST">Receptionist</option>
                <option value="PHARMACIST">Pharmacist</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          </div>
          {form.role !== 'ADMIN' && (
            <div>
              <label className="label">Shift</label>
              <select className="input" value={form.shift} onChange={(e) => setForm({ ...form, shift: e.target.value })}>
                {['DAY', 'NIGHT', 'ROTATING'].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setShowCreate(false)}>
              Cancel
            </button>
            <button
              className="btn-primary"
              disabled={busy || !form.fullName || !form.email || !form.phone || form.password.length < 8}
              onClick={createUser}
            >
              {busy ? 'Saving…' : 'Create user'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
