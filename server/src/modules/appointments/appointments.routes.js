const router = require('express').Router();
const { authenticateUser, authorizeRoles } = require('../../middlewares/auth');
const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/ApiResponse');
const ApiError = require('../../utils/ApiError');
const { validate } = require('../../utils/validate');
const { bookSchema, rescheduleSchema, cancelSchema } = require('./appointments.validation');
const appointmentService = require('./appointments.service');
const Appointment = require('../../models/appointment.model');
const { auditLog } = require('../../services/audit.service');
const { paginateOptions, paginateResult } = require('../../utils/pagination');

const book = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.book(req.body, req.user);
  await auditLog({
    req,
    actorId: req.user.id,
    actorRole: req.user.role,
    action: 'APPOINTMENT_BOOKED',
    targetType: 'Appointment',
    targetId: appointment._id,
    metadata: { slotTime: appointment.slotTime, doctorId: appointment.doctorId },
  });
  return ok(res, appointment, 'Appointment booked', 201);
});

const listMine = asyncHandler(async (req, res) => {
  const data = await appointmentService.listMine(req.user, req.query);
  return ok(res, data);
});

const getById = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id)
    .populate('patientId', 'userId dateOfBirth gender bloodGroup')
    .populate('doctorId', 'specialization consultationFee')
    .lean();
  if (!appointment) throw ApiError.notFound('Appointment not found');
  if (req.user.role === 'PATIENT' && appointment.patientId?.userId?.toString() !== req.user.id) {
    throw ApiError.forbidden('Not your appointment');
  }
  if (req.user.role === 'DOCTOR' && appointment.doctorId?._id?.toString() !== req.user.doctorId) {
    throw ApiError.forbidden('Not your appointment');
  }
  return ok(res, appointment);
});

const cancel = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.cancel(req.params.id, req.user, req.body.reason);
  await auditLog({
    req,
    actorId: req.user.id,
    actorRole: req.user.role,
    action: 'APPOINTMENT_CANCELLED',
    targetType: 'Appointment',
    targetId: appointment._id,
    metadata: { reason: req.body.reason },
  });
  return ok(res, appointment, 'Appointment cancelled');
});

const reschedule = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.reschedule(req.params.id, req.user, req.body);
  await auditLog({
    req,
    actorId: req.user.id,
    actorRole: req.user.role,
    action: 'APPOINTMENT_RESCHEDULED',
    targetType: 'Appointment',
    targetId: appointment._id,
    metadata: { newSlotTime: req.body.newSlotTime },
  });
  return ok(res, appointment, 'Appointment rescheduled');
});

const checkIn = asyncHandler(async (req, res) => {
  const appointment = await appointmentService.checkIn(req.params.id, req.user);
  await auditLog({
    req,
    actorId: req.user.id,
    actorRole: req.user.role,
    action: 'APPOINTMENT_CHECKED_IN',
    targetType: 'Appointment',
    targetId: appointment._id,
  });
  return ok(res, appointment, 'Checked in');
});

const adminList = asyncHandler(async (req, res) => {
  const { page, limit, skip, sort } = paginateOptions(req.query);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.doctorId) filter.doctorId = req.query.doctorId;
  if (req.query.from || req.query.to) {
    filter.appointmentDate = {};
    if (req.query.from) filter.appointmentDate.$gte = new Date(req.query.from);
    if (req.query.to) filter.appointmentDate.$lte = new Date(req.query.to);
  }
  const [docs, total] = await Promise.all([
    Appointment.find(filter)
      .populate({ path: 'patientId', select: 'userId gender dateOfBirth', populate: { path: 'userId', select: 'fullName phone' } })
      .populate({ path: 'doctorId', select: 'specialization userId', populate: { path: 'userId', select: 'fullName' } })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Appointment.countDocuments(filter),
  ]);
  return ok(res, paginateResult(total, docs, page, limit));
});

router.post('/', authenticateUser, authorizeRoles('PATIENT'), validate(bookSchema), book);
router.get('/mine', authenticateUser, authorizeRoles('PATIENT', 'DOCTOR'), listMine);
router.get('/', authenticateUser, authorizeRoles('RECEPTIONIST', 'ADMIN'), adminList);
router.get('/:id', authenticateUser, getById);
router.patch('/:id/cancel', authenticateUser, authorizeRoles('PATIENT', 'RECEPTIONIST', 'ADMIN'), validate(cancelSchema), cancel);
router.patch('/:id/reschedule', authenticateUser, authorizeRoles('PATIENT', 'RECEPTIONIST'), validate(rescheduleSchema), reschedule);
router.patch('/:id/check-in', authenticateUser, authorizeRoles('RECEPTIONIST'), checkIn);

module.exports = router;
