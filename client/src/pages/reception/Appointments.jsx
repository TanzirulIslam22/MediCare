import { useEffect, useState } from 'react';
import { useAsync } from '../../hooks/useAsync';
import { appointmentService, paymentService } from '../../services';
import { PageHeader } from '../../components/PageHeader';
import { Modal } from '../../components/Modal';
import { Badge, Spinner } from '../../components/ui';
import { APPOINTMENT_STATUS_COLORS, fmtMoney, STATUS_LABELS } from '../../utils/format';
import { useToast } from '../../context/ToastContext';
import { errorMessage } from '../../utils/errors';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function ReceptionAppointments() {
  const toast = useToast();
  const [date, setDate] = useState(todayStr());
  const list = useAsync();
  const [paymentTarget, setPaymentTarget] = useState(null);
  const [payForm, setPayForm] = useState({ amount: 0, method: 'CASH', referenceId: '', note: '' });
  const [busy, setBusy] = useState(false);

  const load = () => list.run(() => appointmentService.list({ limit: 100 }));
  useEffect(load, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps

  const items = (list.data?.items || []).filter((a) => a.appointmentDate === date);

  const checkIn = async (a) => {
    setBusy(true);
    try {
      await appointmentService.checkIn(a._id);
      toast.success('Checked in');
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const openPayment = (a) => {
    setPaymentTarget(a);
    setPayForm({ amount: Number(a.doctorSnapshot?.fee) || 0, method: 'CASH', referenceId: '', note: '' });
  };

  const recordPayment = async () => {
    setBusy(true);
    try {
      await paymentService.create({
        patientId: paymentTarget.patientId?._id,
        appointmentId: paymentTarget._id,
        amount: payForm.amount,
        method: payForm.method,
        referenceId: payForm.referenceId || null,
        note: payForm.note,
      });
      toast.success('Payment recorded');
      setPaymentTarget(null);
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title="Appointments" subtitle="Check in patients and record payments" />

      <div className="mb-4">
        <input type="date" className="input max-w-xs" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      {list.loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <div className="card py-12 text-center text-sm text-slate-400">No appointments for this day.</div>
      ) : (
        <div className="card overflow-hidden !p-0">
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Patient</th>
                  <th>Phone</th>
                  <th>Doctor</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((a) => (
                  <tr key={a._id} className="hover:bg-slate-50">
                    <td className="font-semibold text-slate-700">{a.slotTime}</td>
                    <td className="font-medium text-slate-800">{a.patientId?.userId?.fullName || '—'}</td>
                    <td className="text-slate-500">{a.patientId?.userId?.phone || '—'}</td>
                    <td className="text-slate-500">{a.doctorSnapshot?.name || '—'}</td>
                    <td>
                      <Badge color={APPOINTMENT_STATUS_COLORS[a.status]}>{STATUS_LABELS[a.status]}</Badge>
                    </td>
                    <td className="text-right">
                      {a.status === 'BOOKED' && (
                        <button className="btn-success !py-1 !px-3 text-xs" onClick={() => checkIn(a)} disabled={busy}>
                          Check in
                        </button>
                      )}
                      {['CHECKED_IN', 'IN_CONSULTATION', 'COMPLETED'].includes(a.status) && (
                        <button className="btn-secondary !py-1 !px-3 text-xs" onClick={() => openPayment(a)}>
                          Payment
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

      <Modal open={!!paymentTarget} onClose={() => setPaymentTarget(null)} title="Record payment">
        {paymentTarget && (
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-3 text-sm">
              <div className="font-medium text-slate-800">{paymentTarget.patientId?.userId?.fullName}</div>
              <div className="text-xs text-slate-500">
                {paymentTarget.doctorSnapshot?.name} · {paymentTarget.slotTime} · suggested fee{' '}
                {fmtMoney(paymentTarget.doctorSnapshot?.fee)}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Amount (৳)</label>
                <input
                  type="number"
                  className="input"
                  value={payForm.amount}
                  onChange={(e) => setPayForm({ ...payForm, amount: +e.target.value })}
                />
              </div>
              <div>
                <label className="label">Method</label>
                <select className="input" value={payForm.method} onChange={(e) => setPayForm({ ...payForm, method: e.target.value })}>
                  {['CASH', 'CARD', 'MOBILE_BANKING', 'INSURANCE'].map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Reference ID (optional)</label>
              <input className="input" value={payForm.referenceId} onChange={(e) => setPayForm({ ...payForm, referenceId: e.target.value })} />
            </div>
            <div>
              <label className="label">Note</label>
              <input className="input" value={payForm.note} onChange={(e) => setPayForm({ ...payForm, note: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setPaymentTarget(null)}>
                Cancel
              </button>
              <button className="btn-primary" disabled={busy || !payForm.amount} onClick={recordPayment}>
                {busy ? 'Saving…' : 'Record payment'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
