const router = require('express').Router();
const { authenticateUser, authorizeRoles } = require('../../middlewares/auth');
const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/ApiResponse');
const ApiError = require('../../utils/ApiError');
const { validate } = require('../../utils/validate');
const { z } = require('zod');
const { auditLog } = require('../../services/audit.service');
const Prescription = require('../../models/prescription.model');
const Appointment = require('../../models/appointment.model');
const Medicine = require('../../models/medicine.model');
const { paginateOptions, paginateResult } = require('../../utils/pagination');
const { runInTransaction } = require('../../utils/transaction');

const medicineLineSchema = z.object({
  medicineId: z.string().min(1),
  dosage: z.string().min(1),
  frequency: z.string().min(1),
  durationDays: z.number().int().min(1).optional().default(1),
  instructions: z.string().optional().default(''),
});

const createSchema = z.object({
  appointmentId: z.string().min(1),
  diagnosis: z.string().optional().default(''),
  medicines: z.array(medicineLineSchema).min(1, 'At least one medicine is required'),
  notes: z.string().optional().default(''),
});

const dispenseSchema = z.object({
  medicineIndexes: z.array(z.number().int().min(0)).optional(),
});

const create = asyncHandler(async (req, res) => {
  const { appointmentId, medicines, ...rest } = req.body;
  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) throw ApiError.notFound('Appointment not found');
  if (appointment.doctorId.toString() !== req.user.doctorId) {
    throw ApiError.forbidden('You can only prescribe for your own consultations');
  }
  const existing = await Prescription.findOne({ appointmentId });
  if (existing) throw ApiError.conflict('Prescription already exists for this appointment', 'PRESCRIPTION_EXISTS');

  const ids = [...new Set(medicines.map((m) => m.medicineId))];
  const catalog = await Medicine.find({ _id: { $in: ids }, status: 'ACTIVE' }).lean();
  const catalogMap = new Map(catalog.map((m) => [m._id.toString(), m]));

  const lines = medicines.map((m) => {
    const med = catalogMap.get(m.medicineId);
    return { ...m, nameSnapshot: med ? med.name : 'Unknown medicine' };
  });

  const prescription = await Prescription.create({
    patientId: appointment.patientId,
    doctorId: req.user.doctorId,
    appointmentId,
    medicines: lines,
    ...rest,
  });
  await auditLog({
    req,
    actorId: req.user.id,
    actorRole: req.user.role,
    action: 'PRESCRIPTION_CREATED',
    targetType: 'Prescription',
    targetId: prescription._id,
    metadata: { lines: lines.length },
  });
  return ok(res, prescription, 'Prescription created', 201);
});

const listMine = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginateOptions(req.query);
  const filter = { patientId: req.user.patientId };
  const [docs, total] = await Promise.all([
    Prescription.find(filter)
      .populate({ path: 'doctorId', populate: { path: 'userId', select: 'fullName' } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Prescription.countDocuments(filter),
  ]);
  return ok(res, paginateResult(total, docs, page, limit));
});

const listByAppointment = asyncHandler(async (req, res) => {
  const prescription = await Prescription.findOne({ appointmentId: req.params.appointmentId })
    .populate({ path: 'doctorId', populate: { path: 'userId', select: 'fullName' } })
    .lean();
  if (!prescription) throw ApiError.notFound('No prescription for this appointment');
  const allowed = await new Prescription(prescription).canAccess(req.user);
  if (!allowed) throw ApiError.forbidden('You cannot access this prescription');
  return ok(res, prescription);
});

const getById = asyncHandler(async (req, res) => {
  const prescription = await Prescription.findById(req.params.id)
    .populate({ path: 'doctorId', populate: { path: 'userId', select: 'fullName' } })
    .populate('patientId');
  if (!prescription) throw ApiError.notFound('Prescription not found');
  const allowed = await prescription.canAccess(req.user);
  if (!allowed) throw ApiError.forbidden('You cannot access this prescription');
  return ok(res, prescription);
});

const dispense = asyncHandler(async (req, res) => {
  const prescription = await Prescription.findById(req.params.id);
  if (!prescription) throw ApiError.notFound('Prescription not found');

  const indexes = req.body.medicineIndexes && req.body.medicineIndexes.length
    ? req.body.medicineIndexes
    : prescription.medicines.map((_, i) => i);

  await runInTransaction(async (session) => {
    for (const idx of indexes) {
      const line = prescription.medicines[idx];
      if (!line) throw ApiError.badRequest(`Invalid medicine index ${idx}`);
      if (line.dispensed) continue;
      const med = await Medicine.findById(line.medicineId).session(session);
      if (!med) throw ApiError.notFound(`Medicine ${line.nameSnapshot} not found`);
      const qty = line.durationDays;
      if (med.stock < qty) {
        throw ApiError.conflict(`Insufficient stock for ${med.name}`, 'INSUFFICIENT_STOCK');
      }
      await Medicine.updateOne(
        { _id: med._id, stock: { $gte: qty } },
        { $inc: { stock: -qty } },
        { session }
      );
      line.dispensed = true;
      line.dispensedAt = new Date();
    }
    const all = prescription.medicines.every((m) => m.dispensed);
    const some = prescription.medicines.some((m) => m.dispensed);
    prescription.status = all ? 'DISPENSED' : some ? 'PARTIALLY_DISPENSED' : 'PENDING';
    await prescription.save({ session });
  });
  await auditLog({
    req,
    actorId: req.user.id,
    actorRole: req.user.role,
    action: 'PRESCRIPTION_DISPENSED',
    targetType: 'Prescription',
    targetId: prescription._id,
  });
  return ok(res, prescription, 'Dispensed');
});

const listAll = asyncHandler(async (req, res) => {
  const { page, limit, skip, sort } = paginateOptions(req.query);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  const [docs, total] = await Promise.all([
    Prescription.find(filter)
      .populate({ path: 'doctorId', populate: { path: 'userId', select: 'fullName' } })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Prescription.countDocuments(filter),
  ]);
  return ok(res, paginateResult(total, docs, page, limit));
});

router.post('/', authenticateUser, authorizeRoles('DOCTOR'), validate(createSchema), create);
router.get('/mine', authenticateUser, authorizeRoles('PATIENT'), listMine);
router.get('/appointment/:appointmentId', authenticateUser, listByAppointment);
router.get('/', authenticateUser, authorizeRoles('PHARMACIST', 'ADMIN'), listAll);
router.get('/:id', authenticateUser, getById);
router.patch('/:id/dispense', authenticateUser, authorizeRoles('PHARMACIST'), validate(dispenseSchema), dispense);

module.exports = router;
