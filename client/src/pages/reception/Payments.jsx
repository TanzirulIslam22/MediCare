import { useEffect, useState } from 'react';
import { useAsync } from '../../hooks/useAsync';
import { paymentService } from '../../services';
import { PageHeader } from '../../components/PageHeader';
import { Modal } from '../../components/Modal';
import { Badge, Spinner } from '../../components/ui';
import { PAYMENT_STATUS_COLORS, fmtDate, fmtMoney } from '../../utils/format';
import { useToast } from '../../context/ToastContext';
import { errorMessage } from '../../utils/errors';

export default function ReceptionPayments() {
  const toast = useToast();
  const [status, setStatus] = useState('');
  const list = useAsync();
  const [target, setTarget] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => list.run(() => paymentService.list({ limit: 100, status: status || undefined }));
  useEffect(load, [status]);
  // eslint-disable-next-line react-hooks/exhaustive-deps

  const items = list.data?.items || [];

  const updateStatus = async () => {
    setBusy(true);
    try {
      await paymentService.update(target._id, { status: newStatus });
      toast.success('Payment updated');
      setTarget(null);
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title="Payments" subtitle="All recorded payments" />

      <div className="mb-4">
        <select className="input max-w-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {['PENDING', 'PAID', 'FAILED', 'REFUNDED'].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      {list.loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <div className="card py-12 text-center text-sm text-slate-400">No payments found.</div>
      ) : (
        <div className="card overflow-hidden !p-0">
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Patient</th>
                  <th>Method</th>
                  <th>Reference</th>
                  <th className="text-right">Amount</th>
                  <th>Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50">
                    <td>{fmtDate(p.paidAt || p.createdAt)}</td>
                    <td className="font-medium text-slate-800">{p.patientId?.userId?.fullName || '—'}</td>
                    <td className="text-slate-500">{p.method}</td>
                    <td className="font-mono text-xs text-slate-500">{p.referenceId || '—'}</td>
                    <td className="text-right font-semibold text-slate-800">{fmtMoney(p.amount)}</td>
                    <td>
                      <Badge color={PAYMENT_STATUS_COLORS[p.status]}>{p.status}</Badge>
                    </td>
                    <td className="text-right">
                      {['PENDING', 'FAILED'].includes(p.status) && (
                        <button
                          className="text-sm font-medium text-brand-600 hover:underline"
                          onClick={() => {
                            setTarget(p);
                            setNewStatus('PAID');
                          }}
                        >
                          Mark paid
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

      <Modal open={!!target} onClose={() => setTarget(null)} title="Update payment status">
        {target && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              {target.patientId?.userId?.fullName} · {fmtMoney(target.amount)} · {target.method}
            </p>
            <div>
              <label className="label">New status</label>
              <select className="input" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                {['PENDING', 'PAID', 'FAILED', 'REFUNDED'].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setTarget(null)}>
                Cancel
              </button>
              <button className="btn-primary" disabled={busy} onClick={updateStatus}>
                {busy ? 'Saving…' : 'Update'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
