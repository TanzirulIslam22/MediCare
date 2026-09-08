import { useEffect, useState } from 'react';
import { useAsync } from '../../hooks/useAsync';
import { appointmentService, recordService, prescriptionService } from '../../services';
import { PageHeader } from '../../components/PageHeader';
import { Modal } from '../../components/Modal';
import { Badge, Spinner } from '../../components/ui';
import { APPOINTMENT_STATUS_COLORS, fmtDateTime, STATUS_LABELS } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { errorMessage } from '../../utils/errors';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function DoctorAppointments() {
  const toast = useToast();
  const [date, setDate] = useState(todayStr());
  const list = useAsync();
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    list.run(() => appointmentService.mine({ limit: 100 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const items = (list.data?.items || []).filter((a) => a.appointmentDate === date);

  const open = async (a) => {
    setSelected(a);
  };

  return (
    <div>
      <PageHeader title="Appointments" subtitle="View consultations for a specific day" />

      <div className="mb-4">
        <input type="date" className="input max-w-xs" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      {list.loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <div className="card py-12 text-center text-sm text-slate-400">No appointments for this day.</div>
      ) : (
        <div className="card overflow-hidden !p-0">
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Patient</th>
                  <th>Phone</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((a) => (
                  <tr key={a._id} className="hover:bg-slate-50">
                    <td className="font-semibold text-slate-700">{a.slotTime}</td>
                    <td className="font-medium text-slate-800">{a.patientId?.userId?.fullName || '—'}</td>
                    <td className="text-slate-500">{a.patientId?.userId?.phone || '—'}</td>
                    <td className="max-w-[220px] truncate text-slate-500">{a.reason || '—'}</td>
                    <td>
                      <Badge color={APPOINTMENT_STATUS_COLORS[a.status]}>{STATUS_LABELS[a.status]}</Badge>
                    </td>
                    <td className="text-right">
                      {['IN_CONSULTATION'].includes(a.status) ? (
                        <button
                          className="text-sm font-medium text-brand-600 hover:underline"
                          onClick={() => open(a)}
                        >
                          Consult
                        </button>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConsultModal appointment={selected} onClose={() => setSelected(null)} onDone={() => list.run(() => appointmentService.mine({ limit: 100 }))} toast={toast} />
    </div>
  );
}

function ConsultModal({ appointment, onClose, onDone, toast }) {
  const [tab, setTab] = useState('record');
  const existingRecord = useAsync();
  const existingRx = useAsync();

  const [record, setRecord] = useState({
    symptoms: '',
    diagnosis: '',
    clinicalNotes: '',
    testsRecommended: '',
    followUpInstructions: '',
  });
  const [rx, setRx] = useState({
    diagnosis: '',
    medicines: [{ name: '', dosage: '', frequency: '', durationDays: 7, instructions: '' }],
    notes: '',
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!appointment) return;
    setTab('record');
    setRecord({ symptoms: '', diagnosis: '', clinicalNotes: '', testsRecommended: '', followUpInstructions: '' });
    setRx({ diagnosis: '', medicines: [{ name: '', dosage: '', frequency: '', durationDays: 7, instructions: '' }], notes: '' });
    existingRecord.run(() => recordService.listForPatient(appointment.patientId?._id, { limit: 100 }));
    existingRx.run(() => prescriptionService.byAppointment(appointment._id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointment]);

  if (!appointment) return null;

  const rec = existingRecord.data?.items?.[0];
  const rxDoc = existingRx.data;

  const saveRecord = async () => {
    setBusy(true);
    try {
      if (rec) {
        await recordService.update(rec._id, {
          symptoms: record.symptoms.split(',').map((s) => s.trim()).filter(Boolean),
          diagnosis: record.diagnosis,
          clinicalNotes: record.clinicalNotes,
          testsRecommended: record.testsRecommended.split(',').map((s) => s.trim()).filter(Boolean),
          followUpInstructions: record.followUpInstructions,
        });
        toast.success('Record updated');
      } else {
        await recordService.create({
          patientId: appointment.patientId?._id,
          appointmentId: appointment._id,
          symptoms: record.symptoms.split(',').map((s) => s.trim()).filter(Boolean),
          diagnosis: record.diagnosis,
          clinicalNotes: record.clinicalNotes,
          testsRecommended: record.testsRecommended.split(',').map((s) => s.trim()).filter(Boolean),
          followUpInstructions: record.followUpInstructions,
        });
        toast.success('Record created');
      }
      onDone();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const addMedicine = () =>
    setRx({ ...rx, medicines: [...rx.medicines, { name: '', dosage: '', frequency: '', durationDays: 7, instructions: '' }] });

  const setMed = (i, field, value) => {
    const medicines = [...rx.medicines];
    medicines[i] = { ...medicines[i], [field]: value };
    setRx({ ...rx, medicines });
  };

  const saveRx = async () => {
    setBusy(true);
    try {
      const payload = {
        patientId: appointment.patientId?._id,
        appointmentId: appointment._id,
        diagnosis: rx.diagnosis,
        notes: rx.notes,
        medicines: rx.medicines.filter((m) => m.name).map((m) => ({ nameSnapshot: m.name, dosage: m.dosage, frequency: m.frequency, durationDays: m.durationDays, instructions: m.instructions })),
      };
      if (rxDoc) {
        toast.info('A prescription already exists for this visit.');
      } else {
        await prescriptionService.create(payload);
        toast.success('Prescription created');
        existingRx.run(() => prescriptionService.byAppointment(appointment._id));
      }
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const finalize = async () => {
    if (rec) {
      await recordService.finalize(rec._id);
      toast.success('Record finalized');
    }
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={`Consultation — ${appointment.patientId?.userId?.fullName || 'Patient'}`} size="lg">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-slate-500">
          {fmtDateTime(new Date(`${appointment.appointmentDate}T${appointment.slotTime}`))}
        </div>
        <Badge color={APPOINTMENT_STATUS_COLORS[appointment.status]}>{STATUS_LABELS[appointment.status]}</Badge>
      </div>

      <div className="mb-4 inline-flex rounded-lg border border-slate-200 bg-white p-1 text-sm">
        {[
          { id: 'record', label: 'Medical record' },
          { id: 'rx', label: 'Prescription' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-md px-4 py-1.5 font-medium ${tab === t.id ? 'bg-brand-600 text-white' : 'text-slate-600'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'record' && (
        <div className="space-y-3">
          {rec && (
            <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
              A draft record exists for this visit — editing will update it. {rec.isFinalized ? '(Finalized)' : '(Not finalized)'}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Symptoms (comma separated)</label>
              <input className="input" value={record.symptoms} onChange={(e) => setRecord({ ...record, symptoms: e.target.value })} placeholder="Fever, headache" />
            </div>
            <div>
              <label className="label">Diagnosis</label>
              <input className="input" value={record.diagnosis} onChange={(e) => setRecord({ ...record, diagnosis: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Clinical notes</label>
            <textarea className="input" rows="3" value={record.clinicalNotes} onChange={(e) => setRecord({ ...record, clinicalNotes: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Recommended tests (comma separated)</label>
              <input className="input" value={record.testsRecommended} onChange={(e) => setRecord({ ...record, testsRecommended: e.target.value })} />
            </div>
            <div>
              <label className="label">Follow-up instructions</label>
              <input className="input" value={record.followUpInstructions} onChange={(e) => setRecord({ ...record, followUpInstructions: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => existingRecord.run(() => recordService.listForPatient(appointment.patientId?._id, { limit: 100 }))}>
              Refresh
            </button>
            <button className="btn-primary" disabled={busy} onClick={saveRecord}>
              {busy ? 'Saving…' : rec ? 'Update record' : 'Save record'}
            </button>
          </div>
        </div>
      )}

      {tab === 'rx' && (
        <div className="space-y-3">
          {rxDoc && (
            <div className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              Prescription already exists (status: {rxDoc.status}).
            </div>
          )}
          <div>
            <label className="label">Diagnosis (for prescription)</label>
            <input className="input" value={rx.diagnosis} onChange={(e) => setRx({ ...rx, diagnosis: e.target.value })} />
          </div>
          <div className="space-y-2">
            {rx.medicines.map((m, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 rounded-lg border border-slate-100 p-2">
                <input className="input col-span-4" placeholder="Medicine name" value={m.name} onChange={(e) => setMed(i, 'name', e.target.value)} />
                <input className="input col-span-2" placeholder="Dosage" value={m.dosage} onChange={(e) => setMed(i, 'dosage', e.target.value)} />
                <input className="input col-span-3" placeholder="Frequency" value={m.frequency} onChange={(e) => setMed(i, 'frequency', e.target.value)} />
                <input className="input col-span-2" type="number" placeholder="Days" value={m.durationDays} onChange={(e) => setMed(i, 'durationDays', +e.target.value)} />
                <button
                  className="col-span-1 flex items-center justify-center text-red-500"
                  onClick={() => setRx({ ...rx, medicines: rx.medicines.filter((_, x) => x !== i) })}
                >
                  ✕
                </button>
                <input className="input col-span-12" placeholder="Instructions (e.g. after meals)" value={m.instructions} onChange={(e) => setMed(i, 'instructions', e.target.value)} />
              </div>
            ))}
          </div>
          <button className="btn-secondary" onClick={addMedicine}>
            + Add medicine
          </button>
          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows="2" value={rx.notes} onChange={(e) => setRx({ ...rx, notes: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-success" disabled={busy || !!rxDoc} onClick={saveRx}>
              {busy ? 'Saving…' : 'Save prescription'}
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 flex justify-end border-t border-slate-100 pt-3">
        <button className="btn-success" onClick={finalize} disabled={!rec}>
          Finalize &amp; close visit
        </button>
      </div>
    </Modal>
  );
}
