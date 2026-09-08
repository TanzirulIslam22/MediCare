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
const Staff = require('../../models/staff.model');
const { ROLES } = require('../../config');

const createStaffSchema = z.object({
  fullName: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().min(7).max(20),
  password: z.string().min(8).max(72),
  role: z.enum(['RECEPTIONIST', 'PHARMACIST', 'ADMIN']),
  staffType: z.enum(['RECEPTIONIST', 'PHARMACIST']).optional(),
  shift: z.string().optional().default('DAY'),
});

const updateStaffSchema = z.object({
  fullName: z.string().min(2).max(120).optional(),
  phone: z.string().min(7).max(20).optional(),
  isActive: z.boolean().optional(),
  shift: z.string().optional(),
});

const list = asyncHandler(async (req, res) => {
  const { page, limit, skip, sort } = paginateOptions(req.query);
  const filter = { role: { $in: ['RECEPTIONIST', 'PHARMACIST', 'ADMIN'] } };
  if (req.query.role) filter.role = req.query.role;
  if (req.query.search) {
    filter.$or = [
      { fullName: { $regex: req.query.search, $options: 'i' } },
      { email: { $regex: req.query.search, $options: 'i' } },
    ];
  }
  const [docs, total] = await Promise.all([
    User.find(filter)
      .select('fullName email phone role isActive createdAt')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);
  return ok(res, paginateResult(total, docs, page, limit));
});

const create = asyncHandler(async (req, res) => {
  const { fullName, email, phone, password, role, staffType, shift } = req.body;
  const existing = await User.findOne({ $or: [{ email }, { phone }] }).lean();
  if (existing) throw ApiError.conflict('User with that email/phone already exists', 'DUPLICATE_USER');
  let user;
  await runInTransaction(async (session) => {
    user = await User.create([{ fullName, email, phone, passwordHash: password, role }], { session });
    if (role === 'RECEPTIONIST' || role === 'PHARMACIST') {
      await Staff.create(
        [{ userId: user[0]._id, staffType: staffType || role, shift }],
        { session }
      );
    }
  });
  await auditLog({
    req,
    actorId: req.user.id,
    actorRole: req.user.role,
    action: 'USER_CREATED',
    targetType: 'User',
    targetId: user[0]._id,
    metadata: { role },
  });
  return ok(res, user[0].toSafeJSON(), 'User created', 201);
});

const update = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  if (user._id.toString() === req.user.id && req.body.isActive === false) {
    throw ApiError.badRequest('You cannot disable your own account');
  }
  Object.assign(user, req.body);
  await user.save();
  await auditLog({
    req,
    actorId: req.user.id,
    actorRole: req.user.role,
    action: 'USER_UPDATED',
    targetType: 'User',
    targetId: user._id,
  });
  return ok(res, user.toSafeJSON(), 'User updated');
});

router.get('/', authenticateUser, authorizeRoles('ADMIN'), list);
router.post('/', authenticateUser, authorizeRoles('ADMIN'), validate(createStaffSchema), create);
router.patch('/:id', authenticateUser, authorizeRoles('ADMIN'), validate(updateStaffSchema), update);

module.exports = router;
