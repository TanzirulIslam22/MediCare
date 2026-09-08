import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAsync } from '../../hooks/useAsync';
import { adminService } from '../../services';
import { PageHeader } from '../../components/PageHeader';
import { StatCard, Spinner } from '../../components/ui';
import { fmtMoney } from '../../utils/format';

const COLORS = ['#2563eb', '#0d9488', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#f97316', '#64748b'];

export default function Analytics() {
  const [range, setRange] = useState(30);
  const overview = useAsync();
  const topDoctors = useAsync();
  const growth = useAsync();
  const departments = useAsync();

  useEffect(() => {
    const from = new Date(Date.now() - range * 86400000).toISOString().slice(0, 10);
    overview.run(() => adminService.overview({ from }));
    topDoctors.run(() => adminService.topDoctors({ from }));
    growth.run(() => adminService.patientGrowth({ months: 6 }));
    departments.run(() => adminService.departmentStats());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const o = overview.data;
  const revenue = Array.isArray(o?.totals?.revenue) ? (o.totals.revenue[0]?.total || 0) : (o?.totals?.revenue || 0);
  const monthly = o?.monthly || [];

  const statusData = useMemo(
    () => (o?.statusBreakdown || []).map((s) => ({ name: s._id.replace('_', ' '), value: s.count })),
    [o]
  );

  const deptData = useMemo(
    () => (departments.data || []).map((d) => ({ name: d._id, value: d.count })),
    [departments.data]
  );

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="Operational KPIs across the hospital"
        actions={
          <select className="input max-w-[180px]" value={range} onChange={(e) => setRange(+e.target.value)}>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last year</option>
          </select>
        }
      />

      {overview.loading ? (
        <Spinner />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Appointments in range" value={o?.totals?.appointmentsInRange ?? 0} accent="bg-brand-50 text-brand-600" icon={<span>📅</span>} />
            <StatCard label="Revenue" value={fmtMoney(revenue)} accent="bg-emerald-50 text-emerald-600" icon={<span>💰</span>} />
            <StatCard label="Registered patients" value={o?.totals?.patients ?? 0} accent="bg-cyan-50 text-cyan-600" icon={<span>🧑‍🤝‍🧑</span>} />
            <StatCard label="Active doctors" value={o?.totals?.doctors ?? 0} accent="bg-purple-50 text-purple-600" icon={<span>🩺</span>} />
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatCard label="Pending payments" value={o?.totals?.pendingPayments ?? 0} accent="bg-amber-50 text-amber-600" icon={<span>⏳</span>} />
            <StatCard label="Low-stock medicines" value={o?.totals?.lowStock ?? 0} accent="bg-red-50 text-red-600" icon={<span>⚠️</span>} />
          </div>

          <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="card">
              <h2 className="mb-4 text-sm font-semibold text-slate-800">Appointments per month</h2>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="_id" fontSize={11} />
                  <YAxis fontSize={11} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" name="Appointments" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <h2 className="mb-4 text-sm font-semibold text-slate-800">Patient registration growth</h2>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={growth.data || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="_id" fontSize={11} />
                  <YAxis fontSize={11} allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" name="Patients" stroke="#0d9488" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <h2 className="mb-4 text-sm font-semibold text-slate-800">Appointments by status</h2>
              {statusData.length ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                      {statusData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-10 text-center text-sm text-slate-400">No data.</p>
              )}
            </div>

            <div className="card">
              <h2 className="mb-4 text-sm font-semibold text-slate-800">Appointments by department</h2>
              {deptData.length ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={deptData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" fontSize={10} />
                    <YAxis fontSize={11} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" name="Appointments" fill="#0d9488" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-10 text-center text-sm text-slate-400">No data.</p>
              )}
            </div>
          </div>

          <div className="card">
            <h2 className="mb-4 text-sm font-semibold text-slate-800">Top doctors by visits</h2>
            {topDoctors.data?.length ? (
              <table className="table-base">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Doctor</th>
                    <th>Department</th>
                    <th className="text-right">Visits</th>
                  </tr>
                </thead>
                <tbody>
                  {topDoctors.data.map((d, i) => (
                    <tr key={d.doctorId} className="hover:bg-slate-50">
                      <td className="text-slate-400">{i + 1}</td>
                      <td className="font-medium text-slate-800">{d.name}</td>
                      <td className="text-slate-500">{d.department}</td>
                      <td className="text-right font-semibold">{d.visits}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="py-8 text-center text-sm text-slate-400">No data.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
