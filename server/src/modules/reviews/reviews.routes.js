const router = require('express').Router();
const { authenticateUser, authorizeRoles } = require('../../middlewares/auth');
const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/ApiResponse');
const ApiError = require('../../utils/ApiError');
const { validate } = require('../../utils/validate');
const { z } = require('zod');
const Review = require('../../models/review.model');
const Appointment = require('../../models/appointment.model');
const Doctor = require('../../models/doctor.model');

const createSchema = z.object({
  appointmentId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional().default(''),
});

const listForDoctor = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.doctorId);
  if (!doctor) throw ApiError.notFound('Doctor not found');
  const reviews = await Review.find({ doctorId: doctor._id })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate({ path: 'patientId', populate: { path: 'userId', select: 'fullName' } })
    .lean();
  return ok(res, reviews);
});

const create = asyncHandler(async (req, res) => {
  const { appointmentId, rating, comment } = req.body;
  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) throw ApiError.notFound('Appointment not found');
  if (appointment.patientId.toString() !== req.user.patientId) {
    throw ApiError.forbidden('You can only review your own appointments');
  }
  if (appointment.status !== 'COMPLETED') {
    throw ApiError.conflict('Only completed appointments can be reviewed', 'INVALID_STATUS');
  }
  const existing = await Review.findOne({ appointmentId });
  if (existing) throw ApiError.conflict('You already reviewed this appointment', 'DUPLICATE_REVIEW');

  const review = await Review.create({
    patientId: req.user.patientId,
    doctorId: appointment.doctorId,
    appointmentId,
    rating,
    comment,
  });

  const agg = await Review.aggregate([
    { $match: { doctorId: appointment.doctorId } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  if (agg[0]) {
    await Doctor.updateOne(
      { _id: appointment.doctorId },
      { ratingAvg: Math.round(agg[0].avg * 10) / 10, ratingCount: agg[0].count }
    );
  }
  return ok(res, review, 'Review submitted', 201);
});

router.get('/doctor/:doctorId', listForDoctor);
router.post('/', authenticateUser, authorizeRoles('PATIENT'), validate(createSchema), create);

module.exports = router;
