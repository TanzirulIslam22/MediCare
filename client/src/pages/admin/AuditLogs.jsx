import { useEffect, useState } from 'react';
import { useAsync } from '../../hooks/useAsync';
import { adminService } from '../../services';
import { PageHeader } from '../../components/PageHeader';
import { Badge, Spinner } from '../../components/ui';
import { fmtDateTime, initials } from '../../utils/format';

export default function AuditLogs() {
  const [action, setAction] = useState('');
  const list = useAsync();

  useEffect(() => {
    list.run(() => adminService.auditLogs({ limit: 100, action: action || undefined }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action]);

  const items = list.data?.items || [];

  const actionColor = (a) => {
    if (a.includes('DELETED') || a.includes('CANCELLED')) return 'bg-red-100 text-red-700';
    if (a.includes('CREATED') || a.includes('COMPLETED') || a.includes('PAID')) return 'bg-emerald-100 text-emerald-700';
    return 'bg-slate-100 text-slate-600';
  };

  return (
    <div>
      <PageHeader title="Audit Logs" subtitle="Immutable trail of system actions" />

      <div className="mb-4">
        <select className="input max-w-xs" value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="">All actions</option>
          {[
            'USER_REGISTERED',
            'LOGIN_SUCCESS',
            'PASSWORD_RESET',
            'APPOINTMENT_BOOKED',
            'APPOINTMENT_CANCELLED',
            'APPOINTMENT_RESCHEDULED',
            'APPOINTMENT_CHECKED_IN',
            'QUEUE_CALLED_NEXT',
            'QUEUE_STATUS_UPDATED',
            'MEDICAL_RECORD_CREATED',
            'MEDICAL_RECORD_UPDATED',
            'MEDICAL_RECORD_FINALIZED',
            'PAYMENT_RECORDED',
            'PAYMENT_STATUS_UPDATED',
            'USER_CREATED',
            'USER_UPDATED',
            'PATIENT_CREATED',
            'DEPARTMENT_CREATED',
            'DEPARTMENT_UPDATED',
            'DEPARTMENT_DELETED',
          ].map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
      </div>

      {list.loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <div className="card py-12 text-center text-sm text-slate-400">No audit entries.</div>
      ) : (
        <div className="card overflow-hidden !p-0">
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Actor</th>
                  <th>Role</th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>Metadata</th>
                </tr>
              </thead>
              <tbody>
                {items.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap text-slate-500">{fmtDateTime(log.createdAt)}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
                          {initials(log.actorId?.fullName)}
                        </span>
                        <span className="font-medium text-slate-800">{log.actorId?.fullName || log.actorId?.email || '—'}</span>
                      </div>
                    </td>
                    <td className="text-slate-500">{log.actorRole}</td>
                    <td>
                      <Badge color={actionColor(log.action)}>{log.action}</Badge>
                    </td>
                    <td className="text-slate-500">
                      {log.targetType} {log.targetId && <span className="font-mono text-[11px] text-slate-400">({log.targetId})</span>}
                    </td>
                    <td className="max-w-[200px] truncate font-mono text-[11px] text-slate-400">
                      {log.metadata ? JSON.stringify(log.metadata) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
