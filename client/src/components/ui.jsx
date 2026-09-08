export function Badge({ color = 'bg-slate-100 text-slate-700', children }) {
  return <span className={`badge ${color}`}>{children}</span>;
}

export function Spinner({ className = 'h-8 w-8' }) {
  return (
    <div className="flex items-center justify-center py-10">
      <div
        className={`${className} animate-spin rounded-full border-4 border-slate-200 border-t-brand-600`}
      />
    </div>
  );
}

export function EmptyState({ title, hint }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-2xl">
        🩺
      </div>
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export function StatCard({ label, value, icon, accent = 'bg-brand-50 text-brand-600' }) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${accent}`}>{icon}</div>
      <div>
        <div className="text-2xl font-semibold text-slate-800">{value}</div>
        <div className="text-xs font-medium text-slate-500">{label}</div>
      </div>
    </div>
  );
}
