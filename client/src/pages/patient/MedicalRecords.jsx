import { useEffect } from 'react';
import { useAsync } from '../../hooks/useAsync';
import { recordService } from '../../services';
import { PageHeader } from '../../components/PageHeader';
import { Spinner } from '../../components/ui';
import { fmtDate } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';

export default function MedicalRecords() {
  const { user } = useAuth();
  const records = useAsync();

  useEffect(() => {
    if (user) records.run(() => recordService.listForPatient(user.profileId, { limit: 100 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const items = records.data?.items || [];

  return (
    <div>
      <PageHeader title="Medical Records" subtitle="Your consultation history" />

      {records.loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <div className="card py-12 text-center text-sm text-slate-400">No medical records yet.</div>
      ) : (
        <div className="space-y-4">
          {items.map((r) => (
            <div key={r._id} className="card">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-semibold text-slate-800">
                    {r.doctorId?.userId?.fullName || 'Doctor'} · {r.doctorId?.specialization || 'Consultation'}
                  </div>
                  <div className="text-xs text-slate-400">{fmtDate(r.createdAt)}</div>
                </div>
                {r.isFinalized ? (
                  <span className="badge bg-emerald-100 text-emerald-700">Finalized</span>
                ) : (
                  <span className="badge bg-amber-100 text-amber-700">Draft</span>
                )}
              </div>
              <dl className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium uppercase text-slate-400">Diagnosis</dt>
                  <dd className="mt-0.5 text-slate-700">{r.diagnosis || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase text-slate-400">Symptoms</dt>
                  <dd className="mt-0.5 text-slate-700">{(r.symptoms || []).join(', ') || '—'}</dd>
                </div>
                <div className="md:col-span-2">
                  <dt className="text-xs font-medium uppercase text-slate-400">Clinical notes</dt>
                  <dd className="mt-0.5 whitespace-pre-line text-slate-700">{r.clinicalNotes || '—'}</dd>
                </div>
                {r.testsRecommended?.length > 0 && (
                  <div className="md:col-span-2">
                    <dt className="text-xs font-medium uppercase text-slate-400">Recommended tests</dt>
                    <dd className="mt-0.5 text-slate-700">{r.testsRecommended.join(', ')}</dd>
                  </div>
                )}
                {r.followUpInstructions && (
                  <div className="md:col-span-2">
                    <dt className="text-xs font-medium uppercase text-slate-400">Follow-up</dt>
                    <dd className="mt-0.5 text-slate-700">{r.followUpInstructions}</dd>
                  </div>
                )}
              </dl>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
