import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { errorMessage } from '../utils/errors';

const DEMO_CREDENTIALS = [
  { role: 'Admin', email: 'admin@hospital.test', password: 'admin12345' },
  { role: 'Doctor', email: 'doctor1@hospital.test', password: 'doctor12345' },
  { role: 'Receptionist', email: 'reception1@hospital.test', password: 'staff12345' },
  { role: 'Pharmacist', email: 'pharmacist1@hospital.test', password: 'staff12345' },
  { role: 'Patient', email: 'patient1@hospital.test', password: 'patient12345' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const doLogin = async (e, override) => {
    e?.preventDefault();
    setSubmitting(true);
    try {
      const payload = override || { email, password };
      await login(payload);
      const from = location.state?.from?.pathname;
      const roleHome = {
        PATIENT: '/patient',
        DOCTOR: '/doctor',
        RECEPTIONIST: '/reception',
        PHARMACIST: '/pharmacy',
        ADMIN: '/admin',
      };
      navigate(from || roleHome[payload.role], { replace: true });
    } catch (err) {
      toast.error(errorMessage(err, 'Login failed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-3xl">
            🏥
          </div>
          <h1 className="text-2xl font-bold text-slate-800">MediCare HMS</h1>
          <p className="mt-1 text-sm text-slate-500">Hospital Management System</p>
        </div>

        <form onSubmit={doLogin} className="card space-y-4">
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@hospital.test"
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <button className="btn-primary w-full" type="submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white/60 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Demo accounts (click to fill)
          </p>
          <div className="flex flex-wrap gap-2">
            {DEMO_CREDENTIALS.map((c) => (
              <button
                key={c.role}
                type="button"
                onClick={() => {
                  setEmail(c.email);
                  setPassword(c.password);
                  doLogin(null, c);
                }}
                className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100"
              >
                {c.role}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
