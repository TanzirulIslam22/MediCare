import { useEffect, useState } from 'react';
import { useAsync } from '../../hooks/useAsync';
import { prescriptionService } from '../../services';
import { PageHeader } from '../../components/PageHeader';
import { Modal } from '../../components/Modal';
import { Badge, Spinner } from '../../components/ui';
import { PRESCRIPTION_STATUS_COLORS, fmtDateTime } from '../../utils/format';
import { useToast } from '../../context/ToastContext';
import { errorMessage } from '../../utils/errors';

export default function Prescriptions() {
  const toast = useToast();
  const [status, setStatus] = useState('');
  const list = useAsync();
  const [target, setTarget] = useState(null);
  const [selectedLines, setSelectedLines] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = () => list.run(() => prescriptionService.list({ limit: 100, status: status || undefined }));
  useEffect(load, [status]);
  // eslint-disable-next-line react-hooks/exhaustive-deps

  const items = list.data?.items || [];

  const open = (p) => {
    setTarget(p);
    setSelectedLines(p.medicines.map((_, i) => i));
  };

  const dispense = async () => {
    setBusy(true);
    try {
      await prescriptionService.dispense(target._id, selectedLines);
      toast.success('Dispensed successfully');
      setTarget(null);
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const pendingCount = items.filter((p) => p.status === 'PENDING').length;

  return (
    <div>
      <PageHeader title="Prescriptions" subtitle="Dispense medicines against prescriptions" />

      <div className="mb-4">
        <select className="input max-w-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {['PENDING', 'PARTIALLY_DISPENSED', 'DISPENSED'].map((s) => (
            <option key={s} value={s}>
              {s.replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>

      {list.loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <div className="card py-12 text-center text-sm text-slate-400">No prescriptions found.</div>
      ) : (
        <div className="card overflow-hidden !p-0">
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Diagnosis</th>
                  <th>Medicines</th>
                  <th>Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50">
                    <td>{fmtDateTime(p.createdAt)}</td>
                    <td className="font-medium text-slate-800">{p.patientId?.userId?.fullName || '—'}</td>
                    <td className="text-slate-500">{p.doctorId?.userId?.fullName || '—'}</td>
                    <td className="max-w-[160px] truncate text-slate-500">{p.diagnosis || '—'}</td>
                    <td>{p.medicines.length} item(s)</td>
                    <td>
                      <Badge color={PRESCRIPTION_STATUS_COLORS[p.status]}>{p.status.replace('_', ' ')}</Badge>
                    </td>
                    <td className="text-right">
                      {p.status !== 'DISPENSED' && (
                        <button className="text-sm font-medium text-brand-600 hover:underline" onClick={() => open(p)}>
                          Dispense
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={!!target} onClose={() => setTarget(null)} title="Dispense prescription" size="md">
        {target && (
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-3 text-sm">
              <div className="font-medium text-slate-800">{target.patientId?.userId?.fullName}</div>
              <div className="text-xs text-slate-500">
                {target.doctorId?.userId?.fullName} · {target.diagnosis || ''} · {target.status}
              </div>
            </div>
            <p className="text-xs text-slate-500">Select the medicines to dispense now:</p>
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {target.medicines.map((m, i) => (
                <li key={i} className="flex items-center justify-between px-3 py-2">
                  <label className="flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-brand-600"
                      checked={selectedLines.includes(i)}
                      onChange={() =>
                        setSelectedLines((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]))
                      }
                    />
                    <span>
                      <span className="font-medium text-slate-800">{m.nameSnapshot}</span>{' '}
                      <span className="text-xs text-slate-500">
                        {m.dosage} · {m.frequency} · {m.durationDays} days
                      </span>
                    </span>
                  </label>
                  <span className={`badge ${m.dispensed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {m.dispensed ? 'Done' : 'Pending'}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setTarget(null)}>
                Cancel
              </button>
              <button className="btn-primary" disabled={busy || selectedLines.length === 0} onClick={dispense}>
                {busy ? 'Dispensing…' : `Dispense (${selectedLines.length})`}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
