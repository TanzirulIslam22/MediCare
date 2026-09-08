import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAsync } from '../../hooks/useAsync';
import { adminService } from '../../services';
import { PageHeader } from '../../components/PageHeader';
import { Spinner } from '../../components/ui';
import { fmtDateTime, fmtMoney } from '../../utils/format';

const COLORS = ['#2563eb', '#0d9488', '#f59e0b', '#ef4444'];

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const [from, setFrom] = useState(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const revenue = useAsync();
  const [exporting, setExporting] = useState('');

  useEffect(() => {
    revenue.run(() => adminService.revenue({ from, to }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  const r = revenue.data;
  const byMethod = useMemo(() => (r?.byMethod || []).map((m) => ({ name: m._id, value: m.total })), [r]);

  const doExport = async (type) => {
    setExporting(type);
    try {
      const res = await adminService.exportCsv(type, { from, to });
      downloadBlob(res.data, `hospital-${type}-${from}-to-${to}.csv`);
    } catch (err) {
      alert('Export failed');
    } finally {
      setExporting('');
    }
  };

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Revenue analysis and CSV exports"
        actions={
          <>
            <button className="btn-secondary" disabled={!!exporting} onClick={() => doExport('appointments')}>
              {exporting === 'appointments' ? 'Exporting…' : 'Export appointments'}
            </button>
            <button className="btn-secondary" disabled={!!exporting} onClick={() => doExport('payments')}>
              {exporting === 'payments' ? 'Exporting…' : 'Export payments'}
            </button>
            <button className="btn-secondary" disabled={!!exporting} onClick={() => doExport('patients')}>
              {exporting === 'patients' ? 'Exporting…' : 'Export patients'}
            </button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="label">From</label>
          <input type="date" className="input max-w-xs" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" className="input max-w-xs" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      {revenue.loading ? (
        <Spinner />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="card text-center">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Total revenue</div>
              <div className="mt-1 text-3xl font-bold text-slate-800">{fmtMoney(r?.totals?.total || 0)}</div>
              <div className="mt-1 text-sm text-slate-500">{r?.totals?.count || 0} paid transactions</div>
            </div>
            <div className="card text-center">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Range</div>
              <div className="mt-1 text-3xl font-bold text-slate-800">
                {fmtDateTime(r?.range?.start).split(',')[0]} → {fmtDateTime(r?.range?.end).split(',')[0]}
              </div>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="card">
              <h2 className="mb-4 text-sm font-semibold text-slate-800">Revenue by month</h2>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={r?.byMonth || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="_id" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip formatter={(v) => fmtMoney(v)} />
                  <Legend />
                  <Bar dataKey="total" name="Revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="count" name="Transactions" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <h2 className="mb-4 text-sm font-semibold text-slate-800">Revenue by payment method</h2>
              {byMethod.length ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={byMethod} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                      {byMethod.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => fmtMoney(v)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-10 text-center text-sm text-slate-400">No data.</p>
              )}
            </div>
          </div>

          <div className="card">
            <h2 className="mb-4 text-sm font-semibold text-slate-800">Recent payments</h2>
            {r?.recent?.length ? (
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Patient</th>
                    <th>Method</th>
                    <th>Reference</th>
                    <th className="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {r.recent.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-50">
                      <td>{fmtDateTime(p.paidAt)}</td>
                      <td className="font-medium text-slate-800">{p.patientId?.userId?.fullName || '—'}</td>
                      <td className="text-slate-500">{p.method}</td>
                      <td className="font-mono text-xs text-slate-500">{p.referenceId || '—'}</td>
                      <td className="text-right font-semibold text-slate-800">{fmtMoney(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="py-8 text-center text-sm text-slate-400">No payments in this range.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
