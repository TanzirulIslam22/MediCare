import { useEffect } from 'react';
import { useAsync } from '../../hooks/useAsync';
import { prescriptionService } from '../../services';
import { PageHeader } from '../../components/PageHeader';
import { Spinner, Badge } from '../../components/ui';
import { PRESCRIPTION_STATUS_COLORS, fmtDate } from '../../utils/format';

export default function Prescriptions() {
  const list = useAsync();

  useEffect(() => {
    list.run(() => prescriptionService.mine({ limit: 100 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const items = list.data?.items || [];

  return (
    <div>
      <PageHeader title="My Prescriptions" subtitle="Prescribed medicines and dosage instructions" />

      {list.loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <div className="card py-12 text-center text-sm text-slate-400">No prescriptions yet.</div>
      ) : (
        <div className="space-y-4">
          {items.map((p) => (
            <div key={p._id} className="card">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-semibold text-slate-800">
                    {p.doctorId?.userId?.fullName || 'Doctor'}
                    {p.doctorId?.specialization && (
                      <span className="ml-2 text-xs font-normal text-slate-400">{p.doctorId.specialization}</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400">{fmtDate(p.createdAt)}</div>
                </div>
                <Badge color={PRESCRIPTION_STATUS_COLORS[p.status]}>{p.status.replace('_', ' ')}</Badge>
              </div>
              {p.diagnosis && (
                <p className="mb-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  <span className="font-medium">Diagnosis: </span>
                  {p.diagnosis}
                </p>
              )}
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Medicine</th>
                    <th>Dosage</th>
                    <th>Frequency</th>
                    <th>Duration</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {p.medicines.map((m, i) => (
                    <tr key={i}>
                      <td className="font-medium text-slate-800">{m.nameSnapshot}</td>
                      <td>{m.dosage}</td>
                      <td>{m.frequency}</td>
                      <td>{m.durationDays} days</td>
                      <td>
                        {m.dispensed ? (
                          <span className="badge bg-emerald-100 text-emerald-700">Dispensed</span>
                        ) : (
                          <span className="badge bg-amber-100 text-amber-700">Pending</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
