import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAsync } from '../../hooks/useAsync';
import { appointmentService, paymentService } from '../../services';
import { PageHeader } from '../../components/PageHeader';
import { StatCard, Spinner } from '../../components/ui';
import { fmtDateTime, fmtMoney } from '../../utils/format';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function ReceptionDashboard() {
  const payments = useAsync();

  useEffect(() => {
    payments.run(() => paymentService.list({ limit: 8 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const items = payments.data?.items || [];
  const todayPaid = items
    .filter((p) => p.status === 'PAID' && String(p.paidAt || '').startsWith(todayStr().slice(0, 7)))
    .reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div>
      <PageHeader
        title="Reception Desk"
        subtitle="Manage check-ins, queues and payments"
        actions={
          <Link to="/reception/queue" className="btn-primary">
            Open queue
          </Link>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Collected this month" value={fmtMoney(todayPaid)} accent="bg-emerald-50 text-emerald-600" icon={<span>💰</span>} />
        <StatCard label="Recent payments" value={items.length} accent="bg-brand-50 text-brand-600" icon={<span>🧾</span>} />
        <StatCard
          label="Pending collection"
          value={items.filter((p) => p.status === 'PENDING').length}
          accent="bg-amber-50 text-amber-600"
          icon={<span>⏳</span>}
        />
      </div>

      <div className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">Recent payments</h2>
          <Link to="/reception/payments" className="text-xs font-medium text-brand-600 hover:underline">
            View all
          </Link>
        </div>
        {payments.loading ? (
          <Spinner className="h-6 w-6" />
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No payments recorded yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((p) => (
              <li key={p._id} className="flex items-center justify-between py-2.5">
                <div>
                  <div className="text-sm font-medium text-slate-800">{p.patientId?.userId?.fullName || 'Patient'}</div>
                  <div className="text-xs text-slate-400">{fmtDateTime(p.paidAt || p.createdAt)} · {p.method}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-slate-800">{fmtMoney(p.amount)}</span>
                  <span className={`badge ${p.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {p.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
