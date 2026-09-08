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
const Doctor = require('../../models/doctor.model');
const Department = require('../../models/department.model');

const createDoctorSchema = z.object({
  fullName: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().min(7).max(20),
  password: z.string().min(8).max(72),
  departmentId: z.string().min(1),
  specialization: z.string().min(2),
  qualifications: z.array(z.string()).optional().default([]),
  experienceYears: z.number().min(0).optional().default(0),
  consultationFee: z.number().min(0),
  bio: z.string().optional().default(''),
});

const updateDoctorSchema = z.object({
  departmentId: z.string().min(1).optional(),
  specialization: z.string().min(2).optional(),
  qualifications: z.array(z.string()).optional(),
  experienceYears: z.number().min(0).optional(),
  consultationFee: z.number().min(0).optional(),
  bio: z.string().optional(),
  isAcceptingAppointments: z.boolean().optional(),
  fullName: z.string().min(2).max(120).optional(),
  phone: z.string().min(7).max(20).optional(),
});

const service = {
  async listDoctors(query) {    const { page, limit, skip, sort } = paginateOptions(query);
    const filter = {};
    if (query.search) {
      const search = query.search.trim();
      filter.$or = [
        { specialization: { $regex: search, $options: 'i' } },
        { bio: { $regex: search, $options: 'i' } },
        { qualifications: { $regex: search, $options: 'i' } },
      ];
    }
    if (query.departmentId) filter.departmentId = query.departmentId;
    if (query.minFee) filter.consultationFee = { ...(filter.consultationFee || {}), $gte: +query.minFee };
    if (query.maxFee) filter.consultationFee = { ...(filter.consultationFee || {}), $lte: +query.maxFee };
    if (query.accepting === 'true') filter.isAcceptingAppointments = true;
    if (query.specialization) {
      filter.specialization = { $regex: query.specialization, $options: 'i' };
    }

    const doctors = await Doctor.find(filter)
      .populate('departmentId', 'name')
      .populate('userId', 'fullName email phone')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();
    const total = await Doctor.countDocuments(filter);

    const enriched = await Promise.all(
      doctors.map(async (d) => {
        const dept = d.departmentId ? d.departmentId.name : null;
        return {
          ...d,
          departmentName: dept,
          department: dept,
          displayName: d.userId?.fullName || '',
        };
      })
    );
    return paginateResult(total, enriched, page, limit);
  },

  async getDoctor(id) {
    const doctor = await Doctor.findById(id)
      .populate('departmentId')
      .populate('userId', 'fullName email phone')
      .lean();
    if (!doctor) throw ApiError.notFound('Doctor not found');
    return {
      ...doctor,
      departmentName: doctor.departmentId?.name || null,
      displayName: doctor.userId?.fullName || '',
    };
  },

  async createDoctor(payload) {
    const { fullName, email, phone, password, departmentId, ...doctorData } = payload;
    const dept = await Department.findById(departmentId);
    if (!dept) throw ApiError.notFound('Department not found');

    const existing = await User.findOne({ $or: [{ email }, { phone }] }).lean();
    if (existing) throw ApiError.conflict('User with that email/phone already exists', 'DUPLICATE_USER');

    let doctor;
    await runInTransaction(async (session) => {
      const user = await User.create(
        [{ fullName, email, phone, passwordHash: password, role: 'DOCTOR' }],
        { session }
      );
      doctor = await Doctor.create(
        [{ userId: user[0]._id, departmentId, ...doctorData }],
        { session }
      );
    });
    return Doctor.findById(doctor[0]._id).populate('userId', 'fullName email phone');
  },

  async updateDoctor(id, payload, actor) {
    const doctor = await Doctor.findById(id).populate('userId');
    if (!doctor) throw ApiError.notFound('Doctor not found');
    if (!actor.doctorId || actor.doctorId !== id) {
      if (actor.role !== 'ADMIN') throw ApiError.forbidden('You can only edit your own profile');
    }
    if (payload.fullName || payload.phone) {
      const update = {};
      if (payload.fullName) update.fullName = payload.fullName;
      if (payload.phone) update.phone = payload.phone;
      if (update.phone) {
        const clash = await User.findOne({ phone: update.phone, _id: { $ne: doctor.userId._id } }).lean();
        if (clash) throw ApiError.conflict('Phone already in use');
      }
      await User.findByIdAndUpdate(doctor.userId._id, update, { runValidators: true });
    }
    const doc = payload;
    delete doc.fullName;
    delete doc.phone;
    Object.assign(doctor, doc);
    await doctor.save();
    return doctor;
  },
};

const list = asyncHandler(async (req, res) => ok(res, await service.listDoctors(req.query)));
const get = asyncHandler(async (req, res) => ok(res, await service.getDoctor(req.params.id)));

const create = asyncHandler(async (req, res) => {
  const doctor = await service.createDoctor(req.body);
  await auditLog({
    req,
    actorId: req.user.id,
    actorRole: req.user.role,
    action: 'DOCTOR_CREATED',
    targetType: 'Doctor',
    targetId: doctor._id,
  });
  return ok(res, doctor, 'Doctor created', 201);
});

const update = asyncHandler(async (req, res) => {
  const doctor = await service.updateDoctor(req.params.id, req.body, req.user);
  await auditLog({
    req,
    actorId: req.user.id,
    actorRole: req.user.role,
    action: 'DOCTOR_UPDATED',
    targetType: 'Doctor',
    targetId: doctor._id,
  });
  return ok(res, doctor, 'Doctor updated');
});

router.get('/', list);
router.get('/:id', get);
router.post('/', authenticateUser, authorizeRoles('ADMIN'), validate(createDoctorSchema), create);
router.patch(
  '/:id',
  authenticateUser,
  authorizeRoles('DOCTOR', 'ADMIN'),
  validate(updateDoctorSchema),
  update
);

module.exports = router;
