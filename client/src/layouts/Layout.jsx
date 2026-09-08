import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS, initials } from '../utils/format';

const NAV = {
  PATIENT: [
    { to: '/patient', label: 'Dashboard', icon: 'M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10' },
    { to: '/patient/book', label: 'Find a Doctor', icon: 'M15 6a3 3 0 11-6 0 3 3 0 016 0zM6 21v-1a6 6 0 0112 0v1' },
    { to: '/patient/appointments', label: 'My Appointments', icon: 'M8 7V3m8 4V3M3 9h18M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z' },
    { to: '/patient/records', label: 'Medical Records', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.6a2 2 0 011.4.6l4.4 4.4a2 2 0 01.6 1.4V19a2 2 0 01-2 2z' },
    { to: '/patient/prescriptions', label: 'Prescriptions', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
    { to: '/patient/payments', label: 'Payments', icon: 'M3 10h18M7 15h2m4 0h4M5 6h14a1 1 0 011 1v10a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1z' },
  ],
  DOCTOR: [
    { to: '/doctor', label: 'Dashboard', icon: 'M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10' },
    { to: '/doctor/schedule', label: 'My Schedule', icon: 'M8 7V3m8 4V3M3 9h18M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z' },
    { to: '/doctor/appointments', label: 'Appointments', icon: 'M15 6a3 3 0 11-6 0 3 3 0 016 0zM6 21v-1a6 6 0 0112 0v1' },
    { to: '/doctor/queue', label: 'Queue', icon: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6 1a3.5 3.5 0 100-7 3.5 3.5 0 000 7z' },
  ],
  RECEPTIONIST: [
    { to: '/reception', label: 'Dashboard', icon: 'M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10' },
    { to: '/reception/appointments', label: 'Appointments', icon: 'M8 7V3m8 4V3M3 9h18M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z' },
    { to: '/reception/queue', label: 'Queue', icon: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6 1a3.5 3.5 0 100-7 3.5 3.5 0 000 7z' },
    { to: '/reception/patients', label: 'Patients', icon: 'M15 6a3 3 0 11-6 0 3 3 0 016 0zM6 21v-1a6 6 0 0112 0v1' },
    { to: '/reception/payments', label: 'Payments', icon: 'M3 10h18M7 15h2m4 0h4M5 6h14a1 1 0 011 1v10a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1z' },
  ],
  PHARMACIST: [
    { to: '/pharmacy', label: 'Dashboard', icon: 'M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10' },
    { to: '/pharmacy/medicines', label: 'Inventory', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
    { to: '/pharmacy/prescriptions', label: 'Prescriptions', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.6a2 2 0 011.4.6l4.4 4.4a2 2 0 01.6 1.4V19a2 2 0 01-2 2z' },
  ],
  ADMIN: [
    { to: '/admin', label: 'Analytics', icon: 'M3 13h4v8H3v-8zm7-9h4v17h-4V4zm7 5h4v12h-4V9z' },
    { to: '/admin/users', label: 'Users & Staff', icon: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6 1a3.5 3.5 0 100-7 3.5 3.5 0 000 7z' },
    { to: '/admin/doctors', label: 'Doctors', icon: 'M15 6a3 3 0 11-6 0 3 3 0 016 0zM6 21v-1a6 6 0 0112 0v1' },
    { to: '/admin/departments', label: 'Departments', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
    { to: '/admin/reports', label: 'Reports', icon: 'M9 17v-6M13 17V7M17 17v-4M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z' },
    { to: '/admin/audit', label: 'Audit Logs', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  ],
};

function NavItems({ role }) {
  const items = NAV[role] || [];
  return (
    <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to.split('/').length === 2}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
              isActive ? 'bg-white/15 text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white'
            }`
          }
        >
          <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
          </svg>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const role = user.role;
  const displayName = user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="flex w-64 shrink-0 flex-col bg-brand-700">
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 text-lg">
            🏥
          </div>
          <div>
            <div className="text-base font-semibold text-white">MediCare HMS</div>
            <div className="text-[11px] text-slate-300">{ROLE_LABELS[role]} Portal</div>
          </div>
        </div>
        <NavItems role={role} />
        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-sm font-semibold text-white">
              {initials(displayName)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-white">{displayName}</div>
              <div className="truncate text-[11px] text-slate-300">{user.email}</div>
            </div>
          </div>
          <button
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
            className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm text-slate-300 hover:bg-white/10 hover:text-white"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto bg-slate-100 p-6">
        <Outlet />
      </main>
    </div>
  );
}
