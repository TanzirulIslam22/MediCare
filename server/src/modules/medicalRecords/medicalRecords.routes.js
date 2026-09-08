const router = require('express').Router();
const { authenticateUser, authorizeRoles } = require('../../middlewares/auth');
const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/ApiResponse');
const ApiError = require('../../utils/ApiError');
const { validate } = require('../../utils/validate');
const { z } = require('zod');
const { auditLog } = require('../../services/audit.service');
const MedicalRecord = require('../../models/medicalRecord.model');
const Appointment = require('../../models/appointment.model');
const Patient = require('../../models/patient.model');
const { paginateOptions, paginateResult } = require('../../utils/pagination');

const createSchema = z.object({
  appointmentId: z.string().min(1),
  symptoms: z.array(z.string()).optional().default([]),
  diagnosis: z.string().min(2),
  clinicalNotes: z.string().optional().default(''),
  testsRecommended: z.array(z.string()).optional().default([]),
  treatmentNotes: z.string().optional().default(''),
  followUpInstructions: z.string().optional().default(''),
});

const updateSchema = z.object({
  symptoms: z.array(z.string()).optional(),
  diagnosis: z.string().min(2).optional(),
  clinicalNotes: z.string().optional(),
  testsRecommended: z.array(z.string()).optional(),
  treatmentNotes: z.string().optional(),
  followUpInstructions: z.string().optional(),
  changeSummary: z.string().max(300).optional().default(''),
});

const create = asyncHandler(async (req, res) => {
  const { appointmentId, ...data } = req.body;
  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) throw ApiError.notFound('Appointment not found');
  if (appointment.doctorId.toString() !== req.user.doctorId) {
    throw ApiError.forbidden('You can only write records for your own consultations');
  }
  if (appointment.status !== 'IN_CONSULTATION') {
    throw ApiError.conflict('Appointment must be IN_CONSULTATION to write a record', 'INVALID_STATUS');
  }
  const existing = await MedicalRecord.findOne({ appointmentId });
  if (existing) throw ApiError.conflict('Record already exists for this appointment', 'RECORD_EXISTS');

  const record = await MedicalRecord.create({
    patientId: appointment.patientId,
    doctorId: req.user.doctorId,
    appointmentId,
    ...data,
  });
  await auditLog({
    req,
    actorId: req.user.id,
    actorRole: req.user.role,
    action: 'MEDICAL_RECORD_CREATED',
    targetType: 'MedicalRecord',
    targetId: record._id,
  });
  return ok(res, record, 'Medical record created', 201);
});

const listForPatient = asyncHandler(async (req, res) => {
  const { patientId } = req.params;
  const { page, limit, skip, sort } = paginateOptions(req.query);
  const isSelf = req.user.role === 'PATIENT' && req.user.patientId === patientId;
  if (!isSelf && req.user.role !== 'ADMIN') {
    const doctorCan =
      req.user.role === 'DOCTOR' &&
      (await MedicalRecord.exists({ doctorId: req.user.doctorId, patientId }));
    const hasActiveAppt =
      req.user.role === 'DOCTOR' &&
      (await Appointment.exists({
        doctorId: req.user.doctorId,
        patientId,
        status: { $in: ['BOOKED', 'CHECKED_IN', 'IN_CONSULTATION'] },
      }));
    if (!doctorCan && !hasActiveAppt && !isSelf && req.user.role !== 'ADMIN') {
      throw ApiError.forbidden('You cannot view these records');
    }
  }
  const [docs, total] = await Promise.all([
    MedicalRecord.find({ patientId })
      .populate('doctorId', 'specialization')
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'fullName' },
      })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    MedicalRecord.countDocuments({ patientId }),
  ]);
  return ok(res, paginateResult(total, docs, page, limit));
});

const getById = asyncHandler(async (req, res) => {
  const record = await MedicalRecord.findById(req.params.id)
    .populate({ path: 'doctorId', populate: { path: 'userId', select: 'fullName' } })
    .populate('patientId');
  if (!record) throw ApiError.notFound('Record not found');
  const allowed = await record.canAccess(req.user);
  if (!allowed) throw ApiError.forbidden('You cannot access this record');
  return ok(res, record);
});

const update = asyncHandler(async (req, res) => {
  const record = await MedicalRecord.findById(req.params.id);
  if (!record) throw ApiError.notFound('Record not found');
  if (record.doctorId.toString() !== req.user.doctorId) {
    throw ApiError.forbidden('Only the authoring doctor can edit this record');
  }
  if (record.isFinalized) {
    throw ApiError.conflict('Record is finalized and cannot be edited', 'RECORD_FINALIZED');
  }
  const { changeSummary, ...fields } = req.body;
  Object.assign(record, fields);
  record.editHistory.push({
    editedAt: new Date(),
    editedBy: req.user.id,
    changeSummary: changeSummary || 'Record updated',
  });
  await record.save();
  await auditLog({
    req,
    actorId: req.user.id,
    actorRole: req.user.role,
    action: 'MEDICAL_RECORD_UPDATED',
    targetType: 'MedicalRecord',
    targetId: record._id,
  });
  return ok(res, record, 'Record updated');
});

const finalize = asyncHandler(async (req, res) => {
  const record = await MedicalRecord.findById(req.params.id);
  if (!record) throw ApiError.notFound('Record not found');
  if (record.doctorId.toString() !== req.user.doctorId) throw ApiError.forbidden('Not your record');
  record.isFinalized = true;
  await record.save();
  await auditLog({
    req,
    actorId: req.user.id,
    actorRole: req.user.role,
    action: 'MEDICAL_RECORD_FINALIZED',
    targetType: 'MedicalRecord',
    targetId: record._id,
  });
  return ok(res, record, 'Record finalized');
});

router.post('/', authenticateUser, authorizeRoles('DOCTOR'), validate(createSchema), create);
router.get('/patient/:patientId', authenticateUser, listForPatient);
router.get('/:id', authenticateUser, getById);
router.patch('/:id', authenticateUser, authorizeRoles('DOCTOR'), validate(updateSchema), update);
router.patch('/:id/finalize', authenticateUser, authorizeRoles('DOCTOR'), finalize);

module.exports = router;
