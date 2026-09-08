const router = require('express').Router();
const { authenticateUser, authorizeRoles } = require('../../middlewares/auth');
const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/ApiResponse');
const Appointment = require('../../models/appointment.model');
const Payment = require('../../models/payment.model');
const User = require('../../models/user.model');
const Doctor = require('../../models/doctor.model');
const Medicine = require('../../models/medicine.model');
const AuditLog = require('../../models/auditLog.model');
const { paginateOptions, paginateResult } = require('../../utils/pagination');

function rangeFromQuery(query) {
  const { from, to } = query;
  const end = to ? new Date(to) : new Date();
  const start = from ? new Date(from) : new Date(end);
  if (!from) start.setDate(start.getDate() - 30);
  return { start, end };
}

const overview = asyncHandler(async (req, res) => {
  const { start, end } = rangeFromQuery(req.query);
  const [apptTotal, apptToday, pendingPayments, patientsTotal, doctorsTotal, medicineCount, revenue] =
    await Promise.all([
      Appointment.countDocuments({ appointmentDate: { $gte: start, $lte: end } }),
      Appointment.countDocuments({ appointmentDate: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } }),
      Payment.countDocuments({ status: 'PENDING' }),
      User.countDocuments({ role: 'PATIENT' }),
      User.countDocuments({ role: 'DOCTOR' }),
      Medicine.countDocuments({ status: 'ACTIVE' }),
      Payment.aggregate([
        { $match: { status: 'PAID', paidAt: { $gte: start, $lte: end } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

  const statusBreakdown = await Appointment.aggregate([
    { $match: { appointmentDate: { $gte: start, $lte: end } } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const monthly = await Appointment.aggregate([
    { $match: { createdAt: { $gte: start, $lte: end } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const lowStock = await Medicine.countDocuments({ $expr: { $lte: ['$stock', '$minStock'] } });
  const expiringSoon = await Medicine.countDocuments({
    expiryDate: { $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), $gte: new Date() },
  });

  return ok(res, {
    range: { start, end },
    totals: {
      appointmentsInRange: apptTotal,
      appointmentsToday: apptToday,
      pendingPayments,
      patients: patientsTotal,
      doctors: doctorsTotal,
      activeMedicines: medicineCount,
      revenue,
      lowStock,
      expiringSoon,
    },
    statusBreakdown,
    monthly,
  });
});

const revenueReport = asyncHandler(async (req, res) => {
  const { start, end } = rangeFromQuery(req.query);
  const pipeline = [
    { $match: { status: 'PAID', paidAt: { $gte: start, $lte: end } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$paidAt' } },
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ];
  const byMonth = await Payment.aggregate(pipeline);

  const byMethod = await Payment.aggregate([
    { $match: { status: 'PAID', paidAt: { $gte: start, $lte: end } } },
    { $group: { _id: '$method', total: { $sum: '$amount' }, count: { $sum: 1 } } },
  ]);

  const totalRow = await Payment.aggregate([
    { $match: { status: 'PAID', paidAt: { $gte: start, $lte: end } } },
    { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
  ]);

  const recent = await Payment.find({ status: 'PAID' })
    .sort({ paidAt: -1 })
    .limit(20)
    .populate('patientId', 'userId')
    .lean();

  return ok(res, { range: { start, end }, byMonth, byMethod, totals: totalRow[0] || { total: 0, count: 0 }, recent });
});

const topDoctors = asyncHandler(async (req, res) => {
  const { start, end } = rangeFromQuery(req.query);
  const top = await Appointment.aggregate([
    { $match: { status: 'COMPLETED', appointmentDate: { $gte: start, $lte: end } } },
    { $group: { _id: '$doctorId', visits: { $sum: 1 } } },
    { $sort: { visits: -1 } },
    { $limit: 5 },
  ]);
  const doctorIds = top.map((t) => t._id);
  const doctors = await Doctor.find({ _id: { $in: doctorIds } })
    .populate('userId', 'fullName')
    .populate('departmentId', 'name')
    .lean();
  const map = new Map(doctors.map((d) => [d._id.toString(), d]));
  const result = top.map((t) => {
    const d = map.get(t._id?.toString());
    return { doctorId: t._id, name: d?.userId?.fullName || 'Unknown', department: d?.departmentId?.name || '', visits: t.visits };
  });
  return ok(res, result);
});

const patientGrowth = asyncHandler(async (req, res) => {
  const months = parseInt(req.query.months, 10) || 6;
  const since = new Date();
  since.setMonth(since.getMonth() - months);
  const growth = await User.aggregate([
    { $match: { role: 'PATIENT', createdAt: { $gte: since } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  return ok(res, growth);
});

const departmentStats = asyncHandler(async (req, res) => {
  const stats = await Appointment.aggregate([
    { $match: { status: { $in: ['COMPLETED', 'BOOKED', 'CHECKED_IN', 'IN_CONSULTATION'] } } },
    { $lookup: { from: 'doctors', localField: 'doctorId', foreignField: '_id', as: 'doc' } },
    { $unwind: '$doc' },
    { $lookup: { from: 'departments', localField: 'doc.departmentId', foreignField: '_id', as: 'dept' } },
    { $unwind: '$dept' },
    { $group: { _id: '$dept.name', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  return ok(res, stats);
});

const auditLogs = asyncHandler(async (req, res) => {
  const { page, limit, skip, sort } = paginateOptions(req.query);
  const filter = {};
  if (req.query.action) filter.action = req.query.action;
  if (req.query.actorRole) filter.actorRole = req.query.actorRole;
  if (req.query.actorId) filter.actorId = req.query.actorId;
  const [docs, total] = await Promise.all([
    AuditLog.find(filter)
      .populate('actorId', 'fullName email')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);
  return ok(res, paginateResult(total, docs, page, limit));
});

const csvExport = asyncHandler(async (req, res) => {
  const { start, end } = rangeFromQuery(req.query);
  const type = req.params.type;
  if (type === 'appointments') {
    const rows = await Appointment.find({ appointmentDate: { $gte: start, $lte: end } }).lean();
    const header = ['id', 'date', 'slotTime', 'status', 'patientId', 'doctorId', 'reason'];
    const lines = rows.map((r) =>
      [r._id, r.appointmentDate?.toISOString().slice(0, 10), r.slotTime, r.status, r.patientId, r.doctorId, `"${(r.reason || '').replace(/"/g, '""')}"`].join(',')
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="appointments.csv"');
    return res.send([header.join(','), ...lines].join('\n'));
  }
  if (type === 'revenue') {
    const rows = await Payment.find({ status: 'PAID', paidAt: { $gte: start, $lte: end } }).lean();
    const header = ['id', 'paidAt', 'amount', 'method', 'status', 'patientId', 'appointmentId'];
    const lines = rows.map((r) =>
      [r._id, r.paidAt?.toISOString() || '', r.amount, r.method, r.status, r.patientId, r.appointmentId].join(',')
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="revenue.csv"');
    return res.send([header.join(','), ...lines].join('\n'));
  }
  res.status(400).json({ success: false, message: 'Unknown export type', errorCode: 'BAD_REQUEST' });
});

router.get('/analytics/overview', authenticateUser, authorizeRoles('ADMIN'), overview);
router.get('/analytics/top-doctors', authenticateUser, authorizeRoles('ADMIN'), topDoctors);
router.get('/analytics/patient-growth', authenticateUser, authorizeRoles('ADMIN'), patientGrowth);
router.get('/analytics/department-stats', authenticateUser, authorizeRoles('ADMIN'), departmentStats);
router.get('/reports/revenue', authenticateUser, authorizeRoles('ADMIN'), revenueReport);
router.get('/audit-logs', authenticateUser, authorizeRoles('ADMIN'), auditLogs);
router.get('/export/:type', authenticateUser, authorizeRoles('ADMIN'), csvExport);

module.exports = router;
