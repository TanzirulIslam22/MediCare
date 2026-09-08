import { useEffect, useState } from 'react';
import { useAsync } from '../../hooks/useAsync';
import { departmentService } from '../../services';
import { PageHeader } from '../../components/PageHeader';
import { Modal } from '../../components/Modal';
import { Spinner } from '../../components/ui';
import { fmtDate } from '../../utils/format';
import { useToast } from '../../context/ToastContext';
import { errorMessage } from '../../utils/errors';

const EMPTY = { name: '', description: '' };

export default function Departments() {
  const toast = useToast();
  const list = useAsync();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  const load = () => list.run(() => departmentService.list({ limit: 100 }));
  useEffect(load, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps

  const items = list.data?.items || [];

  const createDept = async () => {
    setBusy(true);
    try {
      await departmentService.create(form);
      toast.success('Department created');
      setShowCreate(false);
      setForm(EMPTY);
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (d) => {
    setBusy(true);
    try {
      await departmentService.update(d._id, { isActive: !d.isActive });
      toast.success('Updated');
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (d) => {
    if (!window.confirm(`Delete department "${d.name}"?`)) return;
    setBusy(true);
    try {
      await departmentService.remove(d._id);
      toast.success('Department deleted');
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
        title="Departments"
        subtitle="Organize hospital departments"
        actions={
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            Add department
          </button>
        }
      />

      {list.loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <div className="card py-12 text-center text-sm text-slate-400">No departments yet.</div>
      ) : (
        <div className="card overflow-hidden !p-0">
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((d) => (
                  <tr key={d._id} className="hover:bg-slate-50">
                    <td className="font-medium text-slate-800">{d.name}</td>
                    <td className="max-w-[300px] truncate text-slate-500">{d.description || '—'}</td>
                    <td>
                      <span className={`badge ${d.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                        {d.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="text-slate-500">{fmtDate(d.createdAt)}</td>
                    <td className="text-right">
                      <button className="mr-3 text-sm font-medium text-brand-600 hover:underline" onClick={() => toggleActive(d)} disabled={busy}>
                        {d.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button className="text-sm font-medium text-red-600 hover:underline" onClick={() => remove(d)} disabled={busy}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add department">
        <div className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Cardiology" />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" rows="3" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setShowCreate(false)}>
              Cancel
            </button>
            <button className="btn-primary" disabled={busy || !form.name} onClick={createDept}>
              {busy ? 'Saving…' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
