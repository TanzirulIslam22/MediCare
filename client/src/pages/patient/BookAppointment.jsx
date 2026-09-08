import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAsync } from '../../hooks/useAsync';
import { doctorService, scheduleService, appointmentService } from '../../services';
import { PageHeader } from '../../components/PageHeader';
import { Modal } from '../../components/Modal';
import { Badge, Spinner } from '../../components/ui';
import { SLOT_STATUS_COLORS, fmtMoney, initials } from '../../utils/format';
import { useToast } from '../../context/ToastContext';
import { errorMessage } from '../../utils/errors';
import { useAuth } from '../../context/AuthContext';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function BookAppointment() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const doctors = useAsync();
  const [selected, setSelected] = useState(null);
  const [date, setDate] = useState(todayStr());
  const [reason, setReason] = useState('');
  const [slot, setSlot] = useState(null);
  const [booking, setBooking] = useState(false);
  const available = useAsync();

  const departments = [...new Set((doctors.data?.items || []).map((d) => d.departmentName).filter(Boolean))];

  useEffect(() => {
    doctors.run(() => doctorService.list({ limit: 100, search }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = (doctors.data?.items || []).filter((d) => {
    const okDept = !department || d.departmentName === department;
    const okSearch =
      !search ||
      (d.displayName || '').toLowerCase().includes(search.toLowerCase()) ||
      (d.specialization || '').toLowerCase().includes(search.toLowerCase());
    return okDept && okSearch;
  });

  const pickDoctor = async (doc) => {
    setSelected(doc);
    setSlot(null);
    setDate(todayStr());
    available.run(() => scheduleService.available(doc._id, todayStr()));
  };

  const changeDate = (e) => {
    setDate(e.target.value);
    setSlot(null);
    available.run(() => scheduleService.available(selected._id, e.target.value));
  };

  const confirmBook = async () => {
    setBooking(true);
    try {
      const res = await appointmentService.book({
        doctorId: selected._id,
        scheduleId: available.data.scheduleId,
        slotTime: slot.time,
        appointmentDate: date,
        reason,
      });
      toast.success('Appointment booked successfully');
      navigate(`/patient/appointments?highlight=${res.data._id}`);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not book appointment'));
      available.run(() => scheduleService.available(selected._id, date));
    } finally {
      setBooking(false);
    }
  };

  return (
    <div>
      <PageHeader title="Find a Doctor" subtitle="Search by name, specialization or department and book a slot" />

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          className="input max-w-xs"
          placeholder="Search doctor or specialization…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="input max-w-xs" value={department} onChange={(e) => setDepartment(e.target.value)}>
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {doctors.loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400">No doctors found.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((doc) => (
            <div key={doc._id} className="card flex flex-col">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                  {initials(doc.displayName)}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-slate-800">{doc.displayName}</div>
                  <div className="text-xs text-slate-500">
                    {doc.specialization} · {doc.departmentName}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-400">
                    {doc.consultationFee ? `${fmtMoney(doc.consultationFee)} fee` : 'Consultation fee on request'}
                  </div>
                </div>
              </div>
              <button onClick={() => pickDoctor(doc)} className="btn-primary mt-4 w-full">
                Book a slot
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Book an appointment" size="md">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                {initials(selected.displayName)}
              </div>
              <div>
                <div className="font-semibold text-slate-800">{selected.displayName}</div>
                <div className="text-xs text-slate-500">
                  {selected.specialization} · {selected.departmentName} · {fmtMoney(selected.consultationFee)} fee
                </div>
              </div>
            </div>

            <div>
              <label className="label">Select date</label>
              <input type="date" className="input" value={date} onChange={changeDate} min={todayStr()} />
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
                      type="button"
                      onClick={() => setSlot(s)}
                      className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                        slot?.time === s.time
                          ? 'border-brand-600 bg-brand-600 text-white'
                          : 'border-slate-300 bg-white text-slate-700 hover:border-brand-400'
                      }`}
                    >
                      {s.time}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-sm text-slate-400">
                  No slots available for this date.
                </div>
              )}
            </div>

            <div>
              <label className="label">Reason for visit (optional)</label>
              <textarea
                className="input"
                rows="2"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Brief description of symptoms…"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setSelected(null)}>
                Cancel
              </button>
              <button className="btn-primary" disabled={!slot || booking} onClick={confirmBook}>
                {booking ? 'Booking…' : 'Confirm booking'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
