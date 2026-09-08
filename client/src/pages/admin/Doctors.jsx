import { useEffect, useState } from 'react';
import { useAsync } from '../../hooks/useAsync';
import { doctorService, departmentService } from '../../services';
import { PageHeader } from '../../components/PageHeader';
import { Modal } from '../../components/Modal';
import { Spinner } from '../../components/ui';
import { fmtMoney, initials } from '../../utils/format';
import { useToast } from '../../context/ToastContext';
import { errorMessage } from '../../utils/errors';

const EMPTY = {
  fullName: '',
  email: '',
  phone: '',
  password: '',
  departmentId: '',
  specialization: '',
  qualification: '',
  consultationFee: 0,
};

export default function AdminDoctors() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const list = useAsync();
  const depts = useAsync();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  const load = () => list.run(() => doctorService.list({ limit: 100, search: search || undefined }));
  useEffect(load, [search]);
  useEffect(() => {
    depts.run(() => departmentService.list({ limit: 100 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps

  const items = list.data?.items || [];

  const toggleAccepting = async (d) => {
    setBusy(true);
    try {
      await doctorService.update(d._id, { isAcceptingAppointments: !d.isAcceptingAppointments });
      toast.success('Updated');
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const createDoctor = async () => {
    setBusy(true);
    try {
      await doctorService.create({ ...form, consultationFee: +form.consultationFee });
      toast.success('Doctor added');
      setShowCreate(false);
      setForm(EMPTY);
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
        title="Doctors"
        subtitle="Manage the medical team"
        actions={
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            Add doctor
          </button>
        }
      />

      <div className="mb-4">
        <input className="input max-w-sm" placeholder="Search doctors…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {list.loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <div className="card py-12 text-center text-sm text-slate-400">No doctors found.</div>
      ) : (
        <div className="card overflow-hidden !p-0">
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Doctor</th>
                  <th>Department</th>
                  <th>Specialization</th>
                  <th>Qualification</th>
                  <th className="text-right">Fee</th>
                  <th>Accepting</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((d) => (
                  <tr key={d._id} className="hover:bg-slate-50">
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                          {initials(d.displayName)}
                        </span>
                        <span className="font-medium text-slate-800">{d.displayName}</span>
                      </div>
                    </td>
                    <td className="text-slate-500">{d.departmentName}</td>
                    <td className="text-slate-500">{d.specialization}</td>
                    <td className="text-slate-500">{d.qualification}</td>
                    <td className="text-right font-medium">{fmtMoney(d.consultationFee)}</td>
                    <td>
                      <span className={`badge ${d.isAcceptingAppointments ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                        {d.isAcceptingAppointments ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="text-right">
                      <button className="text-sm font-medium text-brand-600 hover:underline" onClick={() => toggleAccepting(d)} disabled={busy}>
                        {d.isAcceptingAppointments ? 'Pause' : 'Resume'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add doctor" size="md">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="label">Full name</label>
            <input className="input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </div>
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
            <label className="label">Department</label>
            <select className="input" value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
              <option value="">Select…</option>
              {(depts.data?.items || []).map((dep) => (
                <option key={dep._id} value={dep._id}>
                  {dep.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Specialization</label>
            <input className="input" value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} />
          </div>
          <div>
            <label className="label">Qualification</label>
            <input className="input" value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })} />
          </div>
          <div>
            <label className="label">Consultation fee (৳)</label>
            <input className="input" type="number" value={form.consultationFee} onChange={(e) => setForm({ ...form, consultationFee: e.target.value })} />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-secondary" onClick={() => setShowCreate(false)}>
            Cancel
          </button>
          <button
            className="btn-primary"
            disabled={busy || !form.fullName || !form.email || !form.phone || form.password.length < 8 || !form.departmentId}
            onClick={createDoctor}
          >
            {busy ? 'Saving…' : 'Add doctor'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
