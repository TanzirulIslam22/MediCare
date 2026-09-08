const router = require('express').Router();
const { authenticateUser, authorizeRoles } = require('../../middlewares/auth');
const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/ApiResponse');
const ApiError = require('../../utils/ApiError');
const { validate } = require('../../utils/validate');
const { z } = require('zod');
const { auditLog } = require('../../services/audit.service');
const Payment = require('../../models/payment.model');
const Appointment = require('../../models/appointment.model');
const Patient = require('../../models/patient.model');
const { paginateOptions, paginateResult } = require('../../utils/pagination');

const createSchema = z.object({
  patientId: z.string().min(1),
  appointmentId: z.string().min(1),
  amount: z.number().min(0),
  method: z.enum(['CASH', 'CARD', 'MOBILE_BANKING', 'INSURANCE']).optional().default('CASH'),
  referenceId: z.string().optional().nullable(),
  status: z.enum(['PENDING', 'PAID', 'FAILED', 'REFUNDED']).optional().default('PAID'),
  note: z.string().optional().default(''),
});

const updateSchema = z.object({
  status: z.enum(['PENDING', 'PAID', 'FAILED', 'REFUNDED']).optional(),
  method: z.enum(['CASH', 'CARD', 'MOBILE_BANKING', 'INSURANCE']).optional(),
  referenceId: z.string().optional().nullable(),
  note: z.string().optional(),
});

const listMine = asyncHandler(async (req, res) => {
  const { page, limit, skip, sort } = paginateOptions(req.query);
  const filter = { patientId: req.user.patientId };
  const [docs, total] = await Promise.all([
    Payment.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Payment.countDocuments(filter),
  ]);
  return ok(res, paginateResult(total, docs, page, limit));
});

const create = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.body.appointmentId);
  if (!appointment) throw ApiError.notFound('Appointment not found');
  const patient = await Patient.findById(req.body.patientId);
  if (!patient) throw ApiError.notFound('Patient not found');

  const payment = await Payment.create({
    ...req.body,
    paidAt: req.body.status === 'PAID' ? new Date() : null,
    recordedBy: req.user.id,
  });
  await auditLog({
    req,
    actorId: req.user.id,
    actorRole: req.user.role,
    action: 'PAYMENT_RECORDED',
    targetType: 'Payment',
    targetId: payment._id,
    metadata: { amount: payment.amount, method: payment.method, status: payment.status },
  });
  return ok(res, payment, 'Payment recorded', 201);
});

const listAll = asyncHandler(async (req, res) => {
  const { page, limit, skip, sort } = paginateOptions(req.query);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.patientId) filter.patientId = req.query.patientId;
  const [docs, total] = await Promise.all([
    Payment.find(filter).populate('patientId', 'userId').sort(sort).skip(skip).limit(limit).lean(),
    Payment.countDocuments(filter),
  ]);
  return ok(res, paginateResult(total, docs, page, limit));
});

const update = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) throw ApiError.notFound('Payment not found');
  const prevStatus = payment.status;
  Object.assign(payment, req.body);
  if (req.body.status === 'PAID' && prevStatus !== 'PAID') payment.paidAt = new Date();
  if (req.body.status && req.body.status !== 'PAID') payment.paidAt = null;
  await payment.save();
  await auditLog({
    req,
    actorId: req.user.id,
    actorRole: req.user.role,
    action: 'PAYMENT_STATUS_UPDATED',
    targetType: 'Payment',
    targetId: payment._id,
    metadata: { from: prevStatus, to: payment.status },
  });
  return ok(res, payment, 'Payment updated');
});

router.get('/mine', authenticateUser, authorizeRoles('PATIENT'), listMine);
router.post('/', authenticateUser, authorizeRoles('RECEPTIONIST', 'ADMIN'), validate(createSchema), create);
router.get('/', authenticateUser, authorizeRoles('RECEPTIONIST', 'ADMIN'), listAll);
router.patch('/:id', authenticateUser, authorizeRoles('RECEPTIONIST', 'ADMIN'), validate(updateSchema), update);

module.exports = router;
