const router = require('express').Router();
const { authenticateUser, authorizeRoles } = require('../../middlewares/auth');
const Department = require('../../models/department.model');
const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/ApiResponse');
const ApiError = require('../../utils/ApiError');
const { validate } = require('../../utils/validate');
const { z } = require('zod');
const { auditLog } = require('../../services/audit.service');
const { paginateOptions, paginateResult } = require('../../utils/pagination');

const createSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().optional().default(''),
});

const updateSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

const list = asyncHandler(async (req, res) => {
  const { page, limit, skip, sort } = paginateOptions(req.query);
  const filter = {};
  if (req.query.active === 'true') filter.isActive = true;
  if (req.query.active === 'false') filter.isActive = false;
  if (req.query.search) {
    filter.name = { $regex: req.query.search, $options: 'i' };
  }
  const [docs, total] = await Promise.all([
    Department.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Department.countDocuments(filter),
  ]);
  return ok(res, paginateResult(total, docs, page, limit));
});

const create = asyncHandler(async (req, res) => {
  const dept = await Department.create(req.body);
  await auditLog({
    req,
    actorId: req.user.id,
    actorRole: req.user.role,
    action: 'DEPARTMENT_CREATED',
    targetType: 'Department',
    targetId: dept._id,
    metadata: { name: dept.name },
  });
  return ok(res, dept, 'Department created', 201);
});

const update = asyncHandler(async (req, res) => {
  const dept = await Department.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!dept) throw ApiError.notFound('Department not found');
  await auditLog({
    req,
    actorId: req.user.id,
    actorRole: req.user.role,
    action: 'DEPARTMENT_UPDATED',
    targetType: 'Department',
    targetId: dept._id,
  });
  return ok(res, dept, 'Department updated');
});

const remove = asyncHandler(async (req, res) => {
  const dept = await Department.findByIdAndDelete(req.params.id);
  if (!dept) throw ApiError.notFound('Department not found');
  await auditLog({
    req,
    actorId: req.user.id,
    actorRole: req.user.role,
    action: 'DEPARTMENT_DELETED',
    targetType: 'Department',
    targetId: req.params.id,
  });
  return ok(res, null, 'Department deleted');
});

router.get('/', list);
router.post('/', authenticateUser, authorizeRoles('ADMIN'), validate(createSchema), create);
router.patch('/:id', authenticateUser, authorizeRoles('ADMIN'), validate(updateSchema), update);
router.delete('/:id', authenticateUser, authorizeRoles('ADMIN'), remove);

module.exports = router;
