import { useEffect, useState } from 'react';
import { useAsync } from '../../hooks/useAsync';
import { scheduleService } from '../../services';
import { PageHeader } from '../../components/PageHeader';
import { Modal } from '../../components/Modal';
import { Badge, Spinner } from '../../components/ui';
import { SLOT_STATUS_COLORS, fmtDate } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { errorMessage } from '../../utils/errors';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export default function Schedule() {
  const { user } = useAuth();
  const toast = useToast();
  const doctorId = user.profileId;

  const [date, setDate] = useState(todayStr());
  const schedule = useAsync();
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    date: todayStr(),
    startTime: '09:00',
    endTime: '17:00',
    slotDurationMinutes: 30,
    breaks: '',
    weekday: '',
  });

  useEffect(() => {
    schedule.run(() => scheduleService.day(doctorId, date));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, doctorId]);

  const doc = schedule.data;
  const slots = doc?.slots || [];

  const openCreate = () => {
    setForm({ date: todayStr(), startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30, breaks: '', weekday: '' });
    setShowCreate(true);
  };

  const createSchedule = async () => {
    setBusy(true);
    try {
      const breaks = form.breaks
        ? form.breaks
            .split(',')
            .map((b) => b.trim())
            .filter(Boolean)
            .map((b) => {
              const [start, end] = b.split('-');
              return { start, end };
            })
        : [];
      if (form.weekday) {
        const weekday = DAYS.indexOf(form.weekday);
        const dates = [];
        for (let i = 0; i < 7; i++) {
          const d = new Date();
          d.setDate(d.getDate() + ((weekday - d.getDay() + 7) % 7) + i * 7);
          dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
        }
        await scheduleService.bulk({
          doctorId,
          dates,
          startTime: form.startTime,
          endTime: form.endTime,
          slotDurationMinutes: form.slotDurationMinutes,
          breaks,
        });
        toast.success(`Created schedules for the next ${dates.length} ${DAYS[weekday]}s`);
      } else {
        await scheduleService.create({
          doctorId,
          date: form.date,
          startTime: form.startTime,
          endTime: form.endTime,
          slotDurationMinutes: form.slotDurationMinutes,
          breaks,
        });
        toast.success('Schedule created');
      }
      setShowCreate(false);
      schedule.run(() => scheduleService.day(doctorId, date));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const cancelDay = async () => {
    if (!window.confirm('Cancel this day? All booked appointments on this date will be cancelled.')) return;
    setBusy(true);
    try {
      const res = await scheduleService.cancelDay(doctorId, date);
      toast.info(`Day cancelled. ${res.data.cancelledAppointments} appointment(s) affected.`);
      schedule.run(() => scheduleService.day(doctorId, date));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="My Schedule"
        subtitle="Manage your consultation slots"
        actions={
          <>
            <button className="btn-secondary" onClick={cancelDay} disabled={!doc || doc.isCancelled}>
              Cancel this day
            </button>
            <button className="btn-primary" onClick={openCreate}>
              Create schedule
            </button>
          </>
        }
      />

      <div className="mb-4 flex items-center gap-3">
        <input type="date" className="input max-w-xs" value={date} onChange={(e) => setDate(e.target.value)} />
        {doc?.isCancelled && <Badge color="bg-red-100 text-red-700">Day cancelled</Badge>}
      </div>

      {schedule.loading ? (
        <Spinner />
      ) : !doc ? (
        <div className="card py-12 text-center text-sm text-slate-400">
          No schedule for {fmtDate(date)}. Create one to start receiving bookings.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="card lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800">
                Slots · {doc.startTime} – {doc.endTime} ({doc.slotDurationMinutes} min each)
              </h2>
              <div className="flex gap-3 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Available
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Booked
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6">
              {slots.map((s) => (
                <div
                  key={s.time}
                  className={`rounded-lg border px-2 py-2 text-center text-xs font-medium ${
                    s.status === 'AVAILABLE'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : s.status === 'BOOKED'
                        ? 'border-blue-200 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-slate-50 text-slate-400'
                  }`}
                >
                  {s.time}
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 className="mb-3 text-sm font-semibold text-slate-800">Summary</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Total slots</dt>
                <dd className="font-medium">{slots.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Available</dt>
                <dd className="font-medium text-emerald-600">{slots.filter((s) => s.status === 'AVAILABLE').length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Booked</dt>
                <dd className="font-medium text-blue-600">{slots.filter((s) => s.status === 'BOOKED').length}</dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create schedule">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Recurring weekday (optional)</label>
              <select
                className="input"
                value={form.weekday}
                onChange={(e) => setForm({ ...form, weekday: e.target.value })}
              >
                <option value="">One-time only</option>
                {DAYS.map((d) => (
                  <option key={d} value={d}>
                    Every {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">One-time date</label>
              <input
                type="date"
                className="input"
                value={form.date}
                min={todayStr()}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Start</label>
              <input type="time" className="input" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
            </div>
            <div>
              <label className="label">End</label>
              <input type="time" className="input" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
            </div>
            <div>
              <label className="label">Slot (min)</label>
              <select className="input" value={form.slotDurationMinutes} onChange={(e) => setForm({ ...form, slotDurationMinutes: +e.target.value })}>
                {[15, 20, 30, 45, 60].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Breaks (e.g. 13:00-13:30, 15:00-15:15)</label>
            <input className="input" value={form.breaks} onChange={(e) => setForm({ ...form, breaks: e.target.value })} placeholder="13:00-13:30" />
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setShowCreate(false)}>
              Cancel
            </button>
            <button className="btn-primary" disabled={busy} onClick={createSchedule}>
              {busy ? 'Creating…' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
