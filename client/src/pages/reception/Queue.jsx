import { useEffect, useState } from 'react';
import { useAsync } from '../../hooks/useAsync';
import { queueService, doctorService } from '../../services';
import { PageHeader } from '../../components/PageHeader';
import { Modal } from '../../components/Modal';
import { Badge, Spinner } from '../../components/ui';
import { QUEUE_STATUS_COLORS } from '../../utils/format';
import { useToast } from '../../context/ToastContext';
import { errorMessage } from '../../utils/errors';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function ReceptionQueue() {
  const toast = useToast();
  const doctors = useAsync();
  const [doctorId, setDoctorId] = useState('');
  const queue = useAsync();
  const [busy, setBusy] = useState(false);
  const [emergency, setEmergency] = useState(false);
  const [patientId, setPatientId] = useState('');

  useEffect(() => {
    doctors.run(() => doctorService.list({ limit: 100 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (doctorId) queue.run(() => queueService.get(doctorId, todayStr()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorId]);

  const entries = queue.data?.entries || [];

  const runAction = async (fn, successMsg) => {
    setBusy(true);
    try {
      await fn();
      if (successMsg) toast.success(successMsg);
      queue.run(() => queueService.get(doctorId, todayStr()));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const addEmergency = () =>
    runAction(
      () => queueService.emergency(doctorId, patientId),
      'Emergency patient added to queue'
    );

  return (
    <div>
      <PageHeader
        title="Live Queue"
        subtitle="Monitor and manage queues across doctors"
        actions={
          <button className="btn-danger" onClick={() => setEmergency(true)} disabled={!doctorId}>
            Add emergency patient
          </button>
        }
      />

      <div className="mb-4">
        <select className="input max-w-sm" value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
          <option value="">Select a doctor…</option>
          {(doctors.data?.items || []).map((d) => (
            <option key={d._id} value={d._id}>
              {d.displayName} — {d.departmentName}
            </option>
          ))}
        </select>
      </div>

      {!doctorId ? (
        <div className="card py-12 text-center text-sm text-slate-400">Select a doctor to view their queue.</div>
      ) : queue.loading ? (
        <Spinner />
      ) : entries.length === 0 ? (
        <div className="card py-12 text-center text-sm text-slate-400">Queue is empty for this doctor today.</div>
      ) : (
        <div className="card overflow-hidden !p-0">
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Patient</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={`${e.queueNumber}-${e.appointmentId}`} className="hover:bg-slate-50">
                    <td className="font-bold text-slate-700">{e.queueNumber}</td>
                    <td className="font-medium text-slate-800">{e.patientName}</td>
                    <td className="text-slate-500">{e.patientPhone}</td>
                    <td>
                      <Badge color={QUEUE_STATUS_COLORS[e.status]}>{e.status.replace('_', ' ')}</Badge>
                    </td>
                    <td>
                      {e.isEmergency ? <Badge color="bg-red-100 text-red-700">Emergency</Badge> : <span className="text-slate-400">Regular</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={emergency} onClose={() => setEmergency(false)} title="Add emergency patient">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Adding to <span className="font-medium">{(doctors.data?.items || []).find((d) => d._id === doctorId)?.displayName}</span>'s queue. Emergency patients are prioritized.
          </p>
          <div>
            <label className="label">Patient ID</label>
            <input
              className="input"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              placeholder="Paste patient _id from the Patients list"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setEmergency(false)}>
              Cancel
            </button>
            <button className="btn-danger" disabled={!patientId || busy} onClick={addEmergency}>
              {busy ? 'Adding…' : 'Add to queue'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
