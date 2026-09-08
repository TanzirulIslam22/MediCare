import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAsync } from '../../hooks/useAsync';
import { appointmentService, notificationService, paymentService } from '../../services';
import { PageHeader } from '../../components/PageHeader';
import { StatCard, Spinner, Badge } from '../../components/ui';
import { APPOINTMENT_STATUS_COLORS, fmtDateTime, fmtMoney, STATUS_LABELS } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';

export default function PatientDashboard() {
  const { user } = useAuth();
  const appointments = useAsync();
  const payments = useAsync();
  const notifications = useAsync();

  useEffect(() => {
    appointments.run(() => appointmentService.mine({ limit: 5 }));
    payments.run(() => paymentService.mine({ limit: 5 }));
    notifications.run(() => notificationService.list({ limit: 5 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const appts = appointments.data?.items || [];
  const upcoming = appts.filter((a) => ['BOOKED', 'CHECKED_IN', 'IN_CONSULTATION'].includes(a.status));
  const unread = notifications.data?.items?.filter((n) => !n.isRead) || [];

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user.fullName.split(' ')[0] || user.email}`}
        subtitle="Here's what's happening with your care"
        actions={
          <Link to="/patient/book" className="btn-primary">
            Book an appointment
          </Link>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Upcoming appointments" value={upcoming.length} accent="bg-brand-50 text-brand-600" icon={<span>📅</span>} />
        <StatCard label="Unread notifications" value={unread.length} accent="bg-amber-50 text-amber-600" icon={<span>🔔</span>} />
        <StatCard label="Records on file" value={appts.length} accent="bg-emerald-50 text-emerald-600" icon={<span>📋</span>} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Upcoming appointments</h2>
            <Link to="/patient/appointments" className="text-xs font-medium text-brand-600 hover:underline">
              View all
            </Link>
          </div>
          {appointments.loading ? (
            <Spinner className="h-6 w-6" />
          ) : upcoming.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No upcoming appointments. Book one now.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {upcoming.map((a) => (
                <li key={a._id} className="flex items-center justify-between py-2.5">
                  <div>
                    <div className="text-sm font-medium text-slate-800">{a.doctorSnapshot?.name}</div>
                    <div className="text-xs text-slate-400">
                      {fmtDateTime(new Date(`${a.appointmentDate}T${a.slotTime}`))} · {a.doctorSnapshot?.department}
                    </div>
                  </div>
                  <Badge color={APPOINTMENT_STATUS_COLORS[a.status]}>{STATUS_LABELS[a.status]}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Recent activity</h2>
            <Link to="/patient/payments" className="text-xs font-medium text-brand-600 hover:underline">
              Payments
            </Link>
          </div>
          {notifications.loading ? (
            <Spinner className="h-6 w-6" />
          ) : notifications.data?.items?.length ? (
            <ul className="divide-y divide-slate-100">
              {notifications.data.items.map((n) => (
                <li key={n._id} className="flex items-start justify-between py-2.5">
                  <div className="text-sm text-slate-700">{n.message}</div>
                  <div className="ml-3 shrink-0 text-xs text-slate-400">{fmtDateTime(n.createdAt)}</div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-slate-400">No notifications yet.</p>
          )}
          {payments.data?.items?.length > 0 && (
            <div className="mt-3 border-t border-slate-100 pt-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Latest payment</p>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">{fmtDateTime(payments.data.items[0].createdAt)}</span>
                <span className="font-semibold text-slate-800">{fmtMoney(payments.data.items[0].amount)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
