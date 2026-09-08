import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAsync } from '../../hooks/useAsync';
import { appointmentService, scheduleService } from '../../services';
import { PageHeader } from '../../components/PageHeader';
import { Modal } from '../../components/Modal';
import { Badge, Spinner } from '../../components/ui';
import { APPOINTMENT_STATUS_COLORS, STATUS_LABELS } from '../../utils/format';
import { useToast } from '../../context/ToastContext';
import { errorMessage } from '../../utils/errors';

const CANCELLABLE = ['BOOKED', 'CHECKED_IN'];

export default function MyAppointments() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const highlight = params.get('highlight');

  const [tab, setTab] = useState('upcoming');
  const list = useAsync();
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [date, setDate] = useState('');
  const [slot, setSlot] = useState(null);
  const [busy, setBusy] = useState(false);
  const available = useAsync();

  const load = () => {
    list.run(() =>
      appointmentService.mine({ limit: 100, status: tab === 'upcoming' ? 'active' : undefined })
    );
  };

  useEffect(load, [tab]);
  // eslint-disable-next-line react-hooks/exhaustive-deps

  const items = list.data?.items || [];

  const doCancel = async (a) => {
    if (!window.confirm('Cancel this appointment?')) return;
    setBusy(true);
    try {
      await appointmentService.cancel(a._id, 'Cancelled by patient');
      toast.success('Appointment cancelled');
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const openReschedule = async (a) => {
    setRescheduleTarget(a);
    const d = new Date().toISOString().slice(0, 10);
    setDate(d);
    setSlot(null);
    available.run(() => scheduleService.available(a.doctorId, d));
  };

  const changeDate = (e) => {
    setDate(e.target.value);
    setSlot(null);
    available.run(() => scheduleService.available(rescheduleTarget.doctorId, e.target.value));
  };

  const doReschedule = async () => {
    setBusy(true);
    try {
      await appointmentService.reschedule(rescheduleTarget._id, {
        newScheduleId: available.data.scheduleId,
        newSlotTime: slot.time,
        newAppointmentDate: date,
      });
      toast.success('Appointment rescheduled');
      setRescheduleTarget(null);
      load();
    } catch (err) {
      toast.error(errorMessage(err));
      available.run(() => scheduleService.available(rescheduleTarget.doctorId, date));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title="My Appointments" subtitle="Manage your upcoming and past visits" />

      <div className="mb-4 inline-flex rounded-lg border border-slate-200 bg-white p-1 text-sm">
        {['upcoming', 'past'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-4 py-1.5 font-medium capitalize ${
              tab === t ? 'bg-brand-600 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {list.loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <div className="card py-12 text-center text-sm text-slate-400">No appointments found.</div>
      ) : (
        <div className="card overflow-hidden !p-0">
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Doctor</th>
                  <th>Department</th>
                  <th>Date / Time</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((a) => (
                  <tr
                    key={a._id}
                    className={`hover:bg-slate-50 ${highlight === a._id ? 'bg-amber-50' : ''}`}
                  >
                    <td className="font-medium text-slate-800">{a.doctorSnapshot?.name || '—'}</td>
                    <td className="text-slate-500">{a.doctorSnapshot?.department || '—'}</td>
                    <td>
                      {new Date(`${a.appointmentDate}T${a.slotTime}`).toLocaleString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td>
                      <Badge color={APPOINTMENT_STATUS_COLORS[a.status]}>{STATUS_LABELS[a.status]}</Badge>
                    </td>
                    <td className="text-right">
                      {CANCELLABLE.includes(a.status) && (
                        <>
                          <button
                            className="mr-2 text-sm font-medium text-brand-600 hover:underline"
                            onClick={() => openReschedule(a)}
                          >
                            Reschedule
                          </button>
                          <button
                            className="text-sm font-medium text-red-600 hover:underline"
                            onClick={() => doCancel(a)}
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={!!rescheduleTarget}
        onClose={() => setRescheduleTarget(null)}
        title="Reschedule appointment"
      >
        {rescheduleTarget && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Rescheduling with <span className="font-medium">{rescheduleTarget.doctorSnapshot?.name}</span>. A
              different slot will be booked and the old one released.
            </p>
            <div>
              <label className="label">New date</label>
              <input type="date" className="input" value={date} onChange={changeDate} min={new Date().toISOString().slice(0, 10)} />
            </div>
            <div>
              <label className="label">Available slots</label>
              {available.loading ? (
                <Spinner className="h-6 w-6" />
              ) : available.data?.slots?.length ? (
                <div className="flex flex-wrap gap-2">
                  {available.data.slots.map((s) => (
                    <button
                      key={s.time}
                      onClick={() => setSlot(s)}
                      className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
                        slot?.time === s.time
                          ? 'border-brand-600 bg-brand-600 text-white'
                          : 'border-slate-300 hover:border-brand-400'
                      }`}
                    >
                      {s.time}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-sm text-slate-400">
                  No slots on this date.
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setRescheduleTarget(null)}>
                Cancel
              </button>
              <button className="btn-primary" disabled={!slot || busy} onClick={doReschedule}>
                {busy ? 'Rescheduling…' : 'Confirm reschedule'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
