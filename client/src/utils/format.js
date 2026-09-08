export const ROLE_LABELS = {
  PATIENT: 'Patient',
  DOCTOR: 'Doctor',
  RECEPTIONIST: 'Receptionist',
  PHARMACIST: 'Pharmacist',
  ADMIN: 'Admin',
};

export const APPOINTMENT_STATUS_COLORS = {
  BOOKED: 'bg-blue-100 text-blue-700',
  CHECKED_IN: 'bg-cyan-100 text-cyan-700',
  IN_CONSULTATION: 'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-red-100 text-red-700',
  NO_SHOW: 'bg-slate-200 text-slate-600',
};

export const QUEUE_STATUS_COLORS = {
  WAITING: 'bg-slate-100 text-slate-600',
  CALLED: 'bg-amber-100 text-amber-700',
  IN_CONSULTATION: 'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  SKIPPED: 'bg-orange-100 text-orange-700',
  CANCELLED: 'bg-red-100 text-red-700',
  NO_SHOW: 'bg-slate-200 text-slate-600',
};

export const PAYMENT_STATUS_COLORS = {
  PENDING: 'bg-amber-100 text-amber-700',
  PAID: 'bg-emerald-100 text-emerald-700',
  FAILED: 'bg-red-100 text-red-700',
  REFUNDED: 'bg-slate-200 text-slate-600',
};

export const PRESCRIPTION_STATUS_COLORS = {
  PENDING: 'bg-amber-100 text-amber-700',
  PARTIALLY_DISPENSED: 'bg-blue-100 text-blue-700',
  DISPENSED: 'bg-emerald-100 text-emerald-700',
};

export const SLOT_STATUS_COLORS = {
  AVAILABLE: 'bg-emerald-100 text-emerald-700',
  BOOKED: 'bg-blue-100 text-blue-700',
  BLOCKED: 'bg-slate-200 text-slate-600',
};

export const STATUS_LABELS = {
  BOOKED: 'Booked',
  CHECKED_IN: 'Checked in',
  IN_CONSULTATION: 'In consultation',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No show',
  WAITING: 'Waiting',
  CALLED: 'Called',
  SKIPPED: 'Skipped',
};

export function fmtDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function fmtDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function fmtMoney(value) {
  const n = Number(value || 0);
  return `৳${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}
