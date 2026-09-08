import { useEffect } from 'react';
import { useAsync } from '../../hooks/useAsync';
import { paymentService } from '../../services';
import { PageHeader } from '../../components/PageHeader';
import { Spinner, Badge } from '../../components/ui';
import { PAYMENT_STATUS_COLORS, fmtDate, fmtMoney } from '../../utils/format';

export default function Payments() {
  const list = useAsync();

  useEffect(() => {
    list.run(() => paymentService.mine({ limit: 100 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const items = list.data?.items || [];
  const paid = items.filter((p) => p.status === 'PAID').reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div>
      <PageHeader title="My Payments" subtitle="Payment history for your consultations" />

      <div className="mb-4 flex items-center gap-3 rounded-xl border border-brand-100 bg-brand-50 px-5 py-4">
        <span className="text-sm font-medium text-brand-700">Total paid to date:</span>
        <span className="text-lg font-bold text-brand-800">{fmtMoney(paid)}</span>
      </div>

      {list.loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <div className="card py-12 text-center text-sm text-slate-400">No payments yet.</div>
      ) : (
        <div className="card overflow-hidden !p-0">
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Reference</th>
                  <th>Method</th>
                  <th className="text-right">Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50">
                    <td>{fmtDate(p.paidAt || p.createdAt)}</td>
                    <td className="text-slate-500">{p.referenceId || '—'}</td>
                    <td className="text-slate-500">{p.method || '—'}</td>
                    <td className="text-right font-semibold text-slate-800">{fmtMoney(p.amount)}</td>
                    <td>
                      <Badge color={PAYMENT_STATUS_COLORS[p.status]}>{p.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
