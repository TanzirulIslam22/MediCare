import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAsync } from '../../hooks/useAsync';
import { appointmentService, scheduleService, queueService } from '../../services';
import { PageHeader } from '../../components/PageHeader';
import { StatCard, Spinner } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function DoctorDashboard() {
  const { user } = useAuth();
  const doctorId = user.profileId;

  const appointments = useAsync();
  const queue = useAsync();

  useEffect(() => {
    if (!doctorId) return;
    appointments.run(() => appointmentService.mine());
    queue.run(() => queueService.get(doctorId, todayStr()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorId]);

  const items = appointments.data?.items || [];
  const todayAppointments = items.filter((a) => a.appointmentDate === todayStr());
  const inConsultation = todayAppointments.filter((a) => a.status === 'IN_CONSULTATION').length;
  const waiting = (queue.data?.entries || []).filter((e) => e.status === 'WAITING').length;
  const completed = items.filter((a) => a.status === 'COMPLETED').length;

  const stats = useMemo(
    () => [
      { label: "Today's appointments", value: todayAppointments.length, icon: '📅', accent: 'bg-brand-50 text-brand-600' },
      { label: 'Waiting in queue', value: waiting, icon: '🕐', accent: 'bg-amber-50 text-amber-600' },
      { label: 'In consultation', value: inConsultation, icon: '💬', accent: 'bg-cyan-50 text-cyan-600' },
      { label: 'Completed visits', value: completed, icon: '✅', accent: 'bg-emerald-50 text-emerald-600' },
    ],
    [todayAppointments.length, waiting, inConsultation, completed]
  );

  return (
    <div>
      <PageHeader
        title={`Dr. ${user.fullName}`}
        subtitle="Today's practice at a glance"
        actions={
          <Link to="/doctor/queue" className="btn-primary">
            Open queue
          </Link>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <div className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">Today's schedule</h2>
          <Link to="/doctor/schedule" className="text-xs font-medium text-brand-600 hover:underline">
            Manage schedule
          </Link>
        </div>
        {appointments.loading ? (
          <Spinner className="h-6 w-6" />
        ) : todayAppointments.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No appointments today.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {todayAppointments.map((a) => (
              <li key={a._id} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-3">
                  <span className="w-14 rounded-md bg-slate-100 px-2 py-1 text-center text-xs font-semibold text-slate-600">
                    {a.slotTime}
                  </span>
                  <div>
                    <div className="text-sm font-medium text-slate-800">{a.patientId?.userId?.fullName || 'Patient'}</div>
                    <div className="text-xs text-slate-400">{a.reason || '—'}</div>
                  </div>
                </div>
                <span
                  className={`badge ${
                    a.status === 'BOOKED'
                      ? 'bg-blue-100 text-blue-700'
                      : a.status === 'IN_CONSULTATION'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {a.status.replace('_', ' ')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
