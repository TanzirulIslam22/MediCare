import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAsync } from '../../hooks/useAsync';
import { medicineService, prescriptionService } from '../../services';
import { PageHeader } from '../../components/PageHeader';
import { StatCard, Spinner } from '../../components/ui';
import { fmtDate, fmtMoney } from '../../utils/format';

export default function PharmacyDashboard() {
  const meds = useAsync();
  const rx = useAsync();

  useEffect(() => {
    meds.run(() => medicineService.list({ limit: 100 }));
    rx.run(() => prescriptionService.list({ limit: 100, status: 'PENDING' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lowStock = (meds.data?.items || []).filter((m) => m.stock <= m.minStock).length;
  const expiring = (meds.data?.items || []).filter(
    (m) => m.expiryDate && new Date(m.expiryDate).getTime() - Date.now() < 30 * 24 * 3600 * 1000
  ).length;
  const pendingRx = rx.data?.items?.length || 0;

  return (
    <div>
      <PageHeader
        title="Pharmacy"
        subtitle="Inventory and prescription dispensing"
        actions={
          <Link to="/pharmacy/prescriptions" className="btn-primary">
            Dispense prescriptions
          </Link>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Pending prescriptions" value={pendingRx} accent="bg-amber-50 text-amber-600" icon={<span>💊</span>} />
        <StatCard label="Low stock items" value={lowStock} accent="bg-red-50 text-red-600" icon={<span>⚠️</span>} />
        <StatCard label="Expiring in 30 days" value={expiring} accent="bg-orange-50 text-orange-600" icon={<span>⏰</span>} />
      </div>

      <div className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">Inventory at a glance</h2>
          <Link to="/pharmacy/medicines" className="text-xs font-medium text-brand-600 hover:underline">
            Manage inventory
          </Link>
        </div>
        {meds.loading ? (
          <Spinner className="h-6 w-6" />
        ) : (meds.data?.items || []).length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No medicines in inventory.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Generic</th>
                  <th>Stock</th>
                  <th>Min</th>
                  <th>Price</th>
                  <th>Expiry</th>
                </tr>
              </thead>
              <tbody>
                {(meds.data?.items || [])
                  .filter((m) => m.stock <= m.minStock || (m.expiryDate && new Date(m.expiryDate).getTime() - Date.now() < 30 * 24 * 3600 * 1000))
                  .map((m) => (
                    <tr key={m._id} className="hover:bg-slate-50">
                      <td className="font-medium text-slate-800">{m.name}</td>
                      <td className="text-slate-500">{m.genericName}</td>
                      <td>
                        <span className={`badge ${m.stock <= m.minStock ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {m.stock}
                        </span>
                      </td>
                      <td>{m.minStock}</td>
                      <td>{fmtMoney(m.price)}</td>
                      <td className="text-slate-500">{m.expiryDate ? fmtDate(m.expiryDate) : '—'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
