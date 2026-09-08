const router = require('express').Router();
const { authenticateUser, authorizeRoles } = require('../../middlewares/auth');
const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/ApiResponse');
const ApiError = require('../../utils/ApiError');
const { validate } = require('../../utils/validate');
const { z } = require('zod');
const { auditLog } = require('../../services/audit.service');
const { paginateOptions, paginateResult } = require('../../utils/pagination');
const { runInTransaction } = require('../../utils/transaction');
const User = require('../../models/user.model');
const Patient = require('../../models/patient.model');

const createPatientSchema = z.object({
  fullName: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().min(7).max(20),
  password: z.string().min(8).max(72).optional(),
  dateOfBirth: z.string().optional().nullable(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional().nullable(),
  bloodGroup: z.string().optional().nullable(),
  address: z
    .object({
      street: z.string().optional().default(''),
      city: z.string().optional().default(''),
      district: z.string().optional().default(''),
    })
    .optional(),
  emergencyContact: z
    .object({
      name: z.string().optional().default(''),
      phone: z.string().optional().default(''),
      relation: z.string().optional().default(''),
    })
    .optional(),
  allergies: z.array(z.string()).optional().default([]),
  chronicConditions: z.array(z.string()).optional().default([]),
});

const updatePatientSchema = createPatientSchema.partial();

const list = asyncHandler(async (req, res) => {
  const { page, limit, skip, sort } = paginateOptions(req.query);
  const filter = {};
  const users = await User.find(
    req.query.search
      ? { role: 'PATIENT', $or: [{ fullName: { $regex: req.query.search, $options: 'i' } }, { phone: { $regex: req.query.search, $options: 'i' } }] }
      : { role: 'PATIENT' }
  )
    .select('fullName email phone isActive createdAt')
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();

  const ids = users.map((u) => u._id);
  const profiles = await Patient.find({ userId: { $in: ids } }).lean();
  const profileMap = new Map(profiles.map((p) => [p.userId.toString(), p]));
  const docs = users.map((u) => ({ ...u, patientProfile: profileMap.get(u._id.toString()) || null }));
  const total = await User.countDocuments({ role: 'PATIENT' });
  return ok(res, paginateResult(total, docs, page, limit));
});

const get = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.params.id).populate('userId', 'fullName email phone isActive');
  if (!patient) throw ApiError.notFound('Patient not found');
  const patientId = patient._id.toString();
  const allowed =
    req.user.role === 'ADMIN' ||
    req.user.role === 'RECEPTIONIST' ||
    (req.user.role === 'PATIENT' && req.user.patientId === patientId) ||
    (req.user.role === 'DOCTOR' && req.user.doctorId);
  if (!allowed) throw ApiError.forbidden('You cannot access this patient');
  return ok(res, patient);
});

const create = asyncHandler(async (req, res) => {
  const { fullName, email, phone, password = 'changeme123', ...patientData } = req.body;
  const existing = await User.findOne({ $or: [{ email }, { phone }] }).lean();
  if (existing) throw ApiError.conflict('User with that email/phone already exists', 'DUPLICATE_USER');
  let created;
  await runInTransaction(async (session) => {
    const user = await User.create([{ fullName, email, phone, passwordHash: password, role: 'PATIENT' }], {
      session,
    });
    created = await Patient.create([{ userId: user[0]._id, ...patientData }], { session });
  });
  await auditLog({
    req,
    actorId: req.user.id,
    actorRole: req.user.role,
    action: 'PATIENT_CREATED',
    targetType: 'Patient',
    targetId: created[0]._id,
  });
  return ok(res, created[0], 'Patient created', 201);
});

const update = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.params.id);
  if (!patient) throw ApiError.notFound('Patient not found');
  const isSelf = req.user.role === 'PATIENT' && req.user.patientId === req.params.id;
  if (!isSelf && !['ADMIN', 'RECEPTIONIST'].includes(req.user.role)) {
    throw ApiError.forbidden('You cannot edit this patient');
  }
  if (req.body.fullName) {
    await User.findByIdAndUpdate(patient.userId, { fullName: req.body.fullName }, { runValidators: true });
    delete req.body.fullName;
  }
  Object.assign(patient, req.body);
  await patient.save();
  return ok(res, patient, 'Patient updated');
});

router.get('/', authenticateUser, authorizeRoles('ADMIN', 'RECEPTIONIST', 'DOCTOR'), list);
router.post('/', authenticateUser, authorizeRoles('ADMIN', 'RECEPTIONIST'), validate(createPatientSchema), create);
router.get('/:id', authenticateUser, get);
router.patch('/:id', authenticateUser, validate(updatePatientSchema), update);

module.exports = router;
