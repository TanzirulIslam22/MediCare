import { useState } from 'react';
import { Modal } from './Modal';
import { Badge } from './ui';
import { APPOINTMENT_STATUS_COLORS, fmtDate, fmtDateTime, fmtMoney, STATUS_LABELS } from '../utils/format';

export default function AppointmentsTable({ appointments, actions = () => null, detail }) {
  const [selected, setSelected] = useState(null);

  return (
    <div className="card overflow-hidden !p-0">
      <div className="overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Patient</th>
              <th>Doctor</th>
              <th>Date / Time</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Payment</th>
              {detail && <th />}
              {actions && <th className="text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {appointments.length === 0 && (
              <tr>
                <td colSpan={8} className="py-10 text-center text-slate-400">
                  No appointments found
                </td>
              </tr>
            )}
            {appointments.map((a) => {
              const patientName =
                a.patientId?.fullName || a.patientId?.userId?.fullName || a.patientName || '—';
              const doctorName = a.doctorSnapshot?.name || a.doctorName || a.doctorId?.userId?.fullName || '—';
              return (
                <tr key={a._id} className="hover:bg-slate-50">
                  <td className="font-medium text-slate-800">{patientName}</td>
                  <td>
                    {doctorName}
                    {a.doctorSnapshot?.department && (
                      <div className="text-xs text-slate-400">{a.doctorSnapshot.department}</div>
                    )}
                  </td>
                  <td>
                    {fmtDate(a.appointmentDate)}
                    <div className="text-xs text-slate-400">{a.slotTime}</div>
                  </td>
                  <td className="max-w-[200px] truncate text-slate-500">{a.reason || '—'}</td>
                  <td>
                    <Badge color={APPOINTMENT_STATUS_COLORS[a.status] || 'bg-slate-100 text-slate-600'}>
                      {STATUS_LABELS[a.status] || a.status}
                    </Badge>
                  </td>
                  <td>
                    {a.payment ? (
                      <div>
                        <div className="font-medium text-slate-700">{fmtMoney(a.payment.amount)}</div>
                        <div className="text-xs text-slate-400">{a.payment.status}</div>
                      </div>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  {detail && (
                    <td>
                      <button
                        onClick={() => setSelected(a)}
                        className="text-sm font-medium text-brand-600 hover:underline"
                      >
                        View
                      </button>
                    </td>
                  )}
                  {actions && <td className="text-right">{actions(a)}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {detail && (
        <Modal open={!!selected} onClose={() => setSelected(null)} title="Appointment details">
          {selected && (
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-slate-400">Patient</dt>
                <dd className="font-medium text-slate-800">
                  {selected.patientId?.userId?.fullName || selected.patientName || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-400">Phone</dt>
                <dd>{selected.patientId?.userId?.phone || selected.patientPhone || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Doctor</dt>
                <dd>{selected.doctorSnapshot?.name || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Department</dt>
                <dd>{selected.doctorSnapshot?.department || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Date</dt>
                <dd>{fmtDate(selected.appointmentDate)}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Time</dt>
                <dd>{selected.slotTime}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Fee</dt>
                <dd>{fmtMoney(selected.doctorSnapshot?.fee)}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Status</dt>
                <dd>{STATUS_LABELS[selected.status] || selected.status}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-slate-400">Reason</dt>
                <dd>{selected.reason || '—'}</dd>
              </div>
              {selected.cancelReason && (
                <div className="col-span-2">
                  <dt className="text-slate-400">Cancellation reason</dt>
                  <dd className="text-red-600">{selected.cancelReason}</dd>
                </div>
              )}
            </dl>
          )}
        </Modal>
      )}
    </div>
  );
}
