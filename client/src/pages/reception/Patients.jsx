import { useEffect, useState } from 'react';
import { useAsync } from '../../hooks/useAsync';
import { patientService } from '../../services';
import { PageHeader } from '../../components/PageHeader';
import { Modal } from '../../components/Modal';
import { Spinner } from '../../components/ui';
import { fmtDate } from '../../utils/format';
import { useToast } from '../../context/ToastContext';
import { errorMessage } from '../../utils/errors';

const EMPTY_FORM = {
  fullName: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  gender: '',
  bloodGroup: '',
  address: '',
  emergencyName: '',
  emergencyPhone: '',
  emergencyRelation: '',
  allergies: '',
  chronicConditions: '',
};

export default function ReceptionPatients() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const list = useAsync();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);

  const load = () => list.run(() => patientService.list({ limit: 100, search }));
  useEffect(load, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps

  const createPatient = async () => {
    setBusy(true);
    try {
      await patientService.create({
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        dateOfBirth: form.dateOfBirth || null,
        gender: form.gender || undefined,
        bloodGroup: form.bloodGroup || null,
        address: { city: form.address },
        emergencyContact: {
          name: form.emergencyName,
          phone: form.emergencyPhone,
          relation: form.emergencyRelation,
        },
        allergies: form.allergies.split(',').map((s) => s.trim()).filter(Boolean),
        chronicConditions: form.chronicConditions.split(',').map((s) => s.trim()).filter(Boolean),
      });
      toast.success('Patient registered');
      setShowCreate(false);
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const items = list.data?.items || [];

  return (
    <div>
      <PageHeader
        title="Patients"
        subtitle="Register and manage patients"
        actions={
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            Register patient
          </button>
        }
      />

      <div className="mb-4">
        <input
          className="input max-w-sm"
          placeholder="Search by name or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {list.loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <div className="card py-12 text-center text-sm text-slate-400">No patients found.</div>
      ) : (
        <div className="card overflow-hidden !p-0">
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Gender</th>
                  <th>DOB</th>
                  <th>Blood</th>
                  <th>ID</th>
                </tr>
              </thead>
              <tbody>
                {items.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50">
                    <td className="font-medium text-slate-800">{u.fullName}</td>
                    <td className="text-slate-500">{u.email}</td>
                    <td className="text-slate-500">{u.phone}</td>
                    <td>{u.patientProfile?.gender || '—'}</td>
                    <td>{fmtDate(u.patientProfile?.dateOfBirth)}</td>
                    <td>{u.patientProfile?.bloodGroup || '—'}</td>
                    <td className="font-mono text-xs text-slate-400">{u.patientProfile?._id || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Register new patient" size="md">
        <div className="space-y-3">
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
              <label className="label">Date of birth</label>
              <input className="input" type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
            </div>
            <div>
              <label className="label">Gender</label>
              <select className="input" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                <option value="">—</option>
                {['MALE', 'FEMALE', 'OTHER'].map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Blood group</label>
              <input className="input" value={form.bloodGroup} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })} placeholder="O+" />
            </div>
            <div>
              <label className="label">City / address</label>
              <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div>
              <label className="label">Emergency contact name</label>
              <input className="input" value={form.emergencyName} onChange={(e) => setForm({ ...form, emergencyName: e.target.value })} />
            </div>
            <div>
              <label className="label">Emergency contact phone</label>
              <input className="input" value={form.emergencyPhone} onChange={(e) => setForm({ ...form, emergencyPhone: e.target.value })} />
            </div>
            <div>
              <label className="label">Relation</label>
              <input className="input" value={form.emergencyRelation} onChange={(e) => setForm({ ...form, emergencyRelation: e.target.value })} />
            </div>
            <div>
              <label className="label">Allergies (comma separated)</label>
              <input className="input" value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} />
            </div>
            <div>
              <label className="label">Chronic conditions (comma separated)</label>
              <input className="input" value={form.chronicConditions} onChange={(e) => setForm({ ...form, chronicConditions: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setShowCreate(false)}>
              Cancel
            </button>
            <button className="btn-primary" disabled={busy || !form.fullName || !form.email || !form.phone} onClick={createPatient}>
              {busy ? 'Saving…' : 'Register'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
