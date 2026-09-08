const router = require('express').Router();
const { authenticateUser, authorizeRoles } = require('../../middlewares/auth');
const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/ApiResponse');
const ApiError = require('../../utils/ApiError');
const { validate } = require('../../utils/validate');
const { z } = require('zod');
const { auditLog } = require('../../services/audit.service');
const Medicine = require('../../models/medicine.model');
const { paginateOptions, paginateResult } = require('../../utils/pagination');

const createSchema = z.object({
  name: z.string().min(2),
  genericName: z.string().optional().default(''),
  category: z.string().optional().default('GENERAL'),
  manufacturer: z.string().optional().default(''),
  price: z.number().min(0),
  stock: z.number().int().min(0).optional().default(0),
  minStock: z.number().int().min(0).optional().default(10),
  batchNumber: z.string().optional().default(''),
  expiryDate: z.string().optional().nullable(),
  supplier: z.string().optional().default(''),
});

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  genericName: z.string().optional(),
  category: z.string().optional(),
  manufacturer: z.string().optional(),
  price: z.number().min(0).optional(),
  minStock: z.number().int().min(0).optional(),
  batchNumber: z.string().optional(),
  expiryDate: z.string().optional().nullable(),
  supplier: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

const stockSchema = z.object({
  quantity: z.number().int().positive(),
  operation: z.enum(['IN', 'OUT']),
  note: z.string().optional().default(''),
});

const list = asyncHandler(async (req, res) => {
  const { page, limit, skip, sort } = paginateOptions(req.query);
  const filter = {};
  if (req.query.search) {
    filter.$or = [
      { name: { $regex: req.query.search, $options: 'i' } },
      { genericName: { $regex: req.query.search, $options: 'i' } },
    ];
  }
  if (req.query.category) filter.category = req.query.category;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.lowStock === 'true') filter.$expr = { $lte: ['$stock', '$minStock'] };
  if (req.query.expiringInDays) {
    const days = parseInt(req.query.expiringInDays, 10);
    const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    filter.expiryDate = { $lte: until, $gte: new Date() };
  }
  const [docs, total] = await Promise.all([
    Medicine.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Medicine.countDocuments(filter),
  ]);
  return ok(res, paginateResult(total, docs, page, limit));
});

const create = asyncHandler(async (req, res) => {
  const med = await Medicine.create(req.body);
  await auditLog({
    req,
    actorId: req.user.id,
    actorRole: req.user.role,
    action: 'MEDICINE_CREATED',
    targetType: 'Medicine',
    targetId: med._id,
    metadata: { name: med.name },
  });
  return ok(res, med, 'Medicine added', 201);
});

const update = asyncHandler(async (req, res) => {
  const med = await Medicine.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!med) throw ApiError.notFound('Medicine not found');
  await auditLog({
    req,
    actorId: req.user.id,
    actorRole: req.user.role,
    action: 'MEDICINE_UPDATED',
    targetType: 'Medicine',
    targetId: med._id,
  });
  return ok(res, med, 'Medicine updated');
});

const updateStock = asyncHandler(async (req, res) => {
  const { quantity, operation } = req.body;
  const med = await Medicine.findById(req.params.id);
  if (!med) throw ApiError.notFound('Medicine not found');
  if (quantity <= 0) throw ApiError.badRequest('quantity must be positive');

  if (operation === 'IN') {
    await Medicine.updateOne({ _id: med._id }, { $inc: { stock: quantity } });
  } else {
    // Atomic conditional update — never negative stock.
    const result = await Medicine.findOneAndUpdate(
      { _id: med._id, stock: { $gte: quantity } },
      { $inc: { stock: -quantity } },
      { new: true }
    );
    if (!result) throw ApiError.conflict('Insufficient stock', 'INSUFFICIENT_STOCK');
  }
  await auditLog({
    req,
    actorId: req.user.id,
    actorRole: req.user.role,
    action: 'MEDICINE_STOCK_CHANGED',
    targetType: 'Medicine',
    targetId: med._id,
    metadata: { operation, quantity },
  });
  const updated = await Medicine.findById(med._id);
  return ok(res, updated, 'Stock updated');
});

router.get('/', authenticateUser, authorizeRoles('PHARMACIST', 'ADMIN'), list);
router.post('/', authenticateUser, authorizeRoles('PHARMACIST', 'ADMIN'), validate(createSchema), create);
router.patch('/:id', authenticateUser, authorizeRoles('PHARMACIST', 'ADMIN'), validate(updateSchema), update);
router.patch('/:id/stock', authenticateUser, authorizeRoles('PHARMACIST', 'ADMIN'), validate(stockSchema), updateStock);

module.exports = router;
