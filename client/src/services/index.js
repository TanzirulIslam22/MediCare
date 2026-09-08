import API from './api';

export { API, setAccessToken, getAccessToken, clearAccessToken } from './api';

export const authService = {
  register: (payload) => API.post('/auth/register', payload),
  login: (payload) => API.post('/auth/login', payload),
  logout: () => API.post('/auth/logout'),
  forgotPassword: (payload) => API.post('/auth/forgot-password', payload),
  resetPassword: (payload) => API.post('/auth/reset-password', payload),
  me: () => API.get('/auth/me'),
};

export const doctorService = {
  list: (params) => API.get('/doctors', { params }),
  get: (id) => API.get(`/doctors/${id}`),
  create: (payload) => API.post('/doctors', payload),
  update: (id, payload) => API.patch(`/doctors/${id}`, payload),
};

export const departmentService = {
  list: (params) => API.get('/departments', { params }),
  create: (payload) => API.post('/departments', payload),
  update: (id, payload) => API.patch(`/departments/${id}`, payload),
  remove: (id) => API.delete(`/departments/${id}`),
};

export const scheduleService = {
  create: (payload) => API.post('/schedules', payload),
  bulk: (payload) => API.post('/schedules/bulk', payload),
  available: (doctorId, date) => API.get(`/schedules/${doctorId}/available`, { params: { date } }),
  day: (doctorId, date) => API.get(`/schedules/${doctorId}/day`, { params: { date } }),
  cancelDay: (doctorId, date) => API.patch(`/schedules/${doctorId}/cancel-day`, { date }),
};

export const appointmentService = {
  book: (payload) => API.post('/appointments', payload),
  mine: (params) => API.get('/appointments/mine', { params }),
  get: (id) => API.get(`/appointments/${id}`),
  cancel: (id, reason) => API.patch(`/appointments/${id}/cancel`, { reason }),
  reschedule: (id, payload) => API.patch(`/appointments/${id}/reschedule`, payload),
  checkIn: (id) => API.patch(`/appointments/${id}/check-in`),
};

export const queueService = {
  get: (doctorId, date) => API.get(`/queues/${doctorId}`, { params: { date } }),
  callNext: (doctorId) => API.patch(`/queues/${doctorId}/call-next`),
  updateEntry: (appointmentId, status) => API.patch(`/queues/entries/${appointmentId}/status`, { status }),
  emergency: (doctorId, patientId) => API.post(`/queues/${doctorId}/emergency`, { patientId }),
};

export const recordService = {
  create: (payload) => API.post('/medical-records', payload),
  listForPatient: (patientId, params) => API.get(`/medical-records/patient/${patientId}`, { params }),
  get: (id) => API.get(`/medical-records/${id}`),
  update: (id, payload) => API.patch(`/medical-records/${id}`, payload),
  finalize: (id) => API.patch(`/medical-records/${id}/finalize`),
};

export const prescriptionService = {
  create: (payload) => API.post('/prescriptions', payload),
  mine: (params) => API.get('/prescriptions/mine', { params }),
  byAppointment: (appointmentId) => API.get(`/prescriptions/appointment/${appointmentId}`),
  list: (params) => API.get('/prescriptions', { params }),
  get: (id) => API.get(`/prescriptions/${id}`),
  dispense: (id, medicineIndexes) => API.patch(`/prescriptions/${id}/dispense`, { medicineIndexes }),
};

export const medicineService = {
  list: (params) => API.get('/medicines', { params }),
  create: (payload) => API.post('/medicines', payload),
  update: (id, payload) => API.patch(`/medicines/${id}`, payload),
  stock: (id, payload) => API.patch(`/medicines/${id}/stock`, payload),
};

export const paymentService = {
  mine: (params) => API.get('/payments/mine', { params }),
  list: (params) => API.get('/payments', { params }),
  create: (payload) => API.post('/payments', payload),
  update: (id, payload) => API.patch(`/payments/${id}`, payload),
};

export const notificationService = {
  list: (params) => API.get('/notifications', { params }),
  unreadCount: () => API.get('/notifications/unread-count'),
  readAll: () => API.post('/notifications/read-all'),
};

export const patientService = {
  list: (params) => API.get('/patients', { params }),
  get: (id) => API.get(`/patients/${id}`),
  create: (payload) => API.post('/patients', payload),
  update: (id, payload) => API.patch(`/patients/${id}`, payload),
};

export const userService = {
  list: (params) => API.get('/users', { params }),
  create: (payload) => API.post('/users', payload),
  update: (id, payload) => API.patch(`/users/${id}`, payload),
};

export const reviewService = {
  byDoctor: (doctorId) => API.get(`/reviews/doctor/${doctorId}`),
  create: (payload) => API.post('/reviews', payload),
};

export const adminService = {
  overview: (params) => API.get('/admin/analytics/overview', { params }),
  topDoctors: (params) => API.get('/admin/analytics/top-doctors', { params }),
  patientGrowth: (params) => API.get('/admin/analytics/patient-growth', { params }),
  departmentStats: () => API.get('/admin/analytics/department-stats'),
  revenue: (params) => API.get('/admin/reports/revenue', { params }),
  auditLogs: (params) => API.get('/admin/audit-logs', { params }),
  exportCsv: (type, params) => API.get(`/admin/export/${type}`, { params, responseType: 'blob' }),
};
