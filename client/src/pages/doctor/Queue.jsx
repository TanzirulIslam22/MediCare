import { useEffect, useState } from 'react';
import { useAsync } from '../../hooks/useAsync';
import { queueService } from '../../services';
import { PageHeader } from '../../components/PageHeader';
import { Badge, Spinner } from '../../components/ui';
import { QUEUE_STATUS_COLORS } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { errorMessage } from '../../utils/errors';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function DoctorQueue() {
  const { user } = useAuth();
  const toast = useToast();
  const doctorId = user.profileId;

  const queue = useAsync();
  const [busy, setBusy] = useState(false);

  const load = () => queue.run(() => queueService.get(doctorId, todayStr()));
  useEffect(load, [doctorId]);
  // eslint-disable-next-line react-hooks/exhaustive-deps

  const entries = queue.data?.entries || [];

  const runAction = async (fn, successMsg) => {
    setBusy(true);
    try {
      await fn();
      if (successMsg) toast.success(successMsg);
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const callNext = () =>
    runAction(async () => {
      const res = await queueService.callNext(doctorId);
      toast.info(`Patient #${res.data.called.queueNumber} called`);
    });

  const startConsultation = (entry) =>
    runAction(() => queueService.updateEntry(entry.appointmentId, 'IN_CONSULTATION'), `Patient #${entry.queueNumber} in consultation`);

  const completeEntry = (entry) =>
    runAction(() => queueService.updateEntry(entry.appointmentId, 'COMPLETED'), `Patient #${entry.queueNumber} completed`);

  const nowCalling = entries.find((e) => e.status === 'IN_CONSULTATION');
  const called = entries.filter((e) => e.status === 'CALLED');
  const waiting = entries.filter((e) => e.status === 'WAITING');

  return (
    <div>
      <PageHeader
        title="Today's Queue"
        subtitle={`${todayStr()} · ${waiting.length} waiting, ${called.length} called`}
        actions={
          <button className="btn-primary" onClick={callNext} disabled={busy || waiting.length === 0}>
            {busy ? '…' : 'Call next patient'}
          </button>
        }
      />

      {queue.loading ? (
        <Spinner />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="card">
            <h2 className="mb-3 text-sm font-semibold text-slate-800">Now in consultation</h2>
            {nowCalling ? (
              <div className="rounded-xl border-2 border-brand-500 bg-brand-50 p-4 text-center">
                <div className="text-3xl font-bold text-brand-700">#{nowCalling.queueNumber}</div>
                <div className="mt-1 font-medium text-slate-800">{nowCalling.patientName}</div>
                <div className="text-xs text-slate-500">{nowCalling.patientPhone}</div>
                <button className="btn-success mt-4 w-full" onClick={() => completeEntry(nowCalling)} disabled={busy}>
                  Mark completed
                </button>
              </div>
            ) : (
              <p className="py-10 text-center text-sm text-slate-400">No patient in consultation.</p>
            )}
          </div>

          <div className="card lg:col-span-2">
            <h2 className="mb-3 text-sm font-semibold text-slate-800">Waiting list</h2>
            {waiting.length === 0 && called.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-400">Queue is empty.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {[...waiting, ...called].map((e) => (
                  <li key={`${e.queueNumber}-${e.appointmentId}`} className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
                        {e.queueNumber}
                      </span>
                      <div>
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
                          {e.patientName}
                          {e.isEmergency && <Badge color="bg-red-100 text-red-700">Emergency</Badge>}
                        </div>
                        <div className="text-xs text-slate-400">{e.patientPhone}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge color={QUEUE_STATUS_COLORS[e.status]}>{e.status.replace('_', ' ')}</Badge>
                      {e.status === 'CALLED' && (
                        <button className="btn-success !py-1 !px-2 text-xs" onClick={() => startConsultation(e)} disabled={busy}>
                          Start
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
