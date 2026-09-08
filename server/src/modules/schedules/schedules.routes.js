const router = require('express').Router();
const { authenticateUser, authorizeRoles } = require('../../middlewares/auth');
const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/ApiResponse');
const ApiError = require('../../utils/ApiError');
const { validate } = require('../../utils/validate');
const { z } = require('zod');
const { auditLog } = require('../../services/audit.service');
const Schedule = require('../../models/schedule.model');
const Doctor = require('../../models/doctor.model');
const Appointment = require('../../models/appointment.model');
const { notifyUser } = require('../../services/notification.service');
const User = require('../../models/user.model');

const createSchema = z.object({
  doctorId: z.string().min(1),
  date: z.string().min(1, 'date is required'),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'startTime must be HH:MM'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'endTime must be HH:MM'),
  slotDurationMinutes: z.number().int().min(5).max(120).optional().default(15),
  breaks: z
    .array(z.object({ start: z.string(), end: z.string() }))
    .optional()
    .default([]),
});

const createManySchema = z.object({
  doctorId: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  weekdaysOnly: z.boolean().optional().default(false),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  slotDurationMinutes: z.number().int().min(5).max(120).optional().default(15),
  breaks: z.array(z.object({ start: z.string(), end: z.string() })).optional().default([]),
});

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function parseDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw ApiError.badRequest('Invalid date', 'INVALID_DATE');
  d.setHours(0, 0, 0, 0);
  return d;
}

function validateWindow(startTime, endTime, breaks) {
  if (!TIME_RE.test(startTime) || !TIME_RE.test(endTime)) {
    throw ApiError.badRequest('Invalid time format, expected HH:MM');
  }
  const toMins = (t) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  if (toMins(endTime) <= toMins(startTime)) {
    throw ApiError.badRequest('endTime must be after startTime');
  }
  if (breaks && Array.isArray(breaks)) {
    for (const b of breaks) {
      if (!TIME_RE.test(b.start) || !TIME_RE.test(b.end)) {
        throw ApiError.badRequest('Break times must be HH:MM');
      }
      if (toMins(b.end) <= toMins(b.start)) throw ApiError.badRequest('Break end must be after start');
    }
  }
}

const service = {
  async assertDoctor(doctorId) {
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) throw ApiError.notFound('Doctor not found');
    return doctor;
  },

  async createSchedule(payload, actor) {
    const { doctorId, date, startTime, endTime, slotDurationMinutes, breaks } = payload;
    const doctor = await this.assertDoctor(doctorId);
    if (actor.role === 'DOCTOR' && actor.doctorId !== doctorId) {
      throw ApiError.forbidden('You can only manage your own schedule');
    }
    validateWindow(startTime, endTime, breaks);
    const parsedDate = parseDate(date);

    const schedule = new Schedule({
      doctorId,
      date: parsedDate,
      startTime,
      endTime,
      slotDurationMinutes,
      breaks,
    });
    schedule.generateSlots();
    try {
      await schedule.save();
    } catch (err) {
      if (err.code === 11000) {
        throw ApiError.conflict('A schedule already exists for this doctor and date', 'SCHEDULE_EXISTS');
      }
      throw err;
    }
    return { schedule, doctor };
  },

  async createMany(payload, actor) {
    const { doctorId, startDate, endDate, weekdaysOnly, startTime, endTime, slotDurationMinutes, breaks } = payload;
    await this.assertDoctor(doctorId);
    if (actor.role === 'DOCTOR' && actor.doctorId !== doctorId) {
      throw ApiError.forbidden('You can only manage your own schedule');
    }
    validateWindow(startTime, endTime, breaks);
    const from = parseDate(startDate);
    const to = parseDate(endDate);
    if (to < from) throw ApiError.badRequest('endDate must be after startDate');

    const created = [];
    const seen = new Set();
    const cursor = new Date(from);
    while (cursor <= to) {
      const day = cursor.getDay();
      if (weekdaysOnly && (day === 0 || day === 6)) {
        cursor.setDate(cursor.getDate() + 1);
        continue;
      }
      const key = `${doctorId}_${cursor.toISOString().slice(0, 10)}`;
      if (seen.has(key)) {
        cursor.setDate(cursor.getDate() + 1);
        continue;
      }
      seen.add(key);
      const schedule = new Schedule({
        doctorId,
        date: new Date(cursor),
        startTime,
        endTime,
        slotDurationMinutes,
        breaks,
      });
      schedule.generateSlots();
      try {
        await schedule.save();
        created.push(schedule);
      } catch (err) {
        if (err.code === 11000) continue;
        throw err;
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return created;
  },

  async getAvailableSlots(doctorId, date) {
    if (!doctorId) throw ApiError.badRequest('doctorId is required');
    const parsedDate = date ? parseDate(date) : new Date();
    const doctor = await Doctor.findById(doctorId).populate('userId', 'fullName').lean();
    if (!doctor) throw ApiError.notFound('Doctor not found');
    const schedule = await Schedule.findOne({ doctorId, date: parsedDate }).lean();
    if (!schedule || schedule.isCancelled) return { doctorId, date: parsedDate, slots: [], scheduleId: null };
    const now = new Date();
    const available = schedule.slots.filter((s) => {
      if (s.status !== 'AVAILABLE') return false;
      if (parsedDate.toDateString() === now.toDateString()) {
        const [h, m] = s.time.split(':').map(Number);
        return h * 60 + m > now.getHours() * 60 + now.getMinutes();
      }
      return true;
    });
    return {
      doctorId,
      date: parsedDate,
      doctorName: doctor.userId?.fullName || '',
      scheduleId: schedule._id,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      slots: available,
    };
  },

  async cancelDay(doctorId, date, actor) {
    const parsedDate = parseDate(date);
    const schedule = await Schedule.findOne({ doctorId, date: parsedDate });
    if (!schedule) throw ApiError.notFound('No schedule for that day');
    schedule.isCancelled = true;
    schedule.slots.forEach((s) => {
      if (s.status === 'AVAILABLE') s.status = 'BLOCKED';
    });
    await schedule.save();

    const booked = await Appointment.find({
      scheduleId: schedule._id,
      status: { $in: ['BOOKED', 'CHECKED_IN'] },
    });
    const patientUserIds = await User.find({ _id: { $in: booked.map((a) => a.patientId) } }, '_id').lean();
    // Simplify: notify via appointment patient profiles
    const Patient = require('../../models/patient.model');
    const profiles = await Patient.find({ _id: { $in: booked.map((a) => a.patientId) } })
      .select('userId')
      .lean();
    const notifyIds = profiles.map((p) => p.userId);
    for (const appt of booked) {
      appt.status = 'CANCELLED';
      appt.cancelledBy = actor.role;
      appt.cancelReason = 'Doctor absent — schedule cancelled';
      await appt.save();
    }
    await Promise.all(
      notifyIds.map((uid) =>
        notifyUser(uid, 'APPOINTMENT_CANCELLED', 'Your appointment was cancelled because the doctor is unavailable. Please rebook.')
      )
    );
    return { cancelledAppointments: booked.length };
  },
};

const create = asyncHandler(async (req, res) => {
  const { schedule, doctor } = await service.createSchedule(req.body, req.user);
  await auditLog({
    req,
    actorId: req.user.id,
    actorRole: req.user.role,
    action: 'SCHEDULE_CREATED',
    targetType: 'Schedule',
    targetId: schedule._id,
    metadata: { doctorId: doctor._id },
  });
  return ok(res, schedule, 'Schedule created', 201);
});

const createMany = asyncHandler(async (req, res) => {
  const created = await service.createMany(req.body, req.user);
  await auditLog({
    req,
    actorId: req.user.id,
    actorRole: req.user.role,
    action: 'SCHEDULES_CREATED_BULK',
    metadata: { count: created.length },
  });
  return ok(res, { count: created.length, schedules: created }, 'Schedules created', 201);
});

const availableSlots = asyncHandler(async (req, res) =>
  ok(res, await service.getAvailableSlots(req.params.doctorId, req.query.date))
);

const getDay = asyncHandler(async (req, res) => {
  const doctorId = req.params.doctorId;
  const date = req.query.date ? parseDate(req.query.date) : new Date();
  const schedule = await Schedule.findOne({ doctorId, date }).lean();
  if (!schedule) throw ApiError.notFound('No schedule for that day');
  if (req.user.doctorId && req.user.doctorId !== doctorId) {
    throw ApiError.forbidden('Not your schedule');
  }
  return ok(res, schedule);
});

const cancelDay = asyncHandler(async (req, res) => {
  const result = await service.cancelDay(req.params.doctorId, req.body.date, req.user);
  await auditLog({
    req,
    actorId: req.user.id,
    actorRole: req.user.role,
    action: 'SCHEDULE_CANCELLED_DAY',
    metadata: { doctorId: req.params.doctorId, cancelledAppointments: result.cancelledAppointments },
  });
  return ok(res, result, 'Day schedule cancelled');
});

router.post('/', authenticateUser, authorizeRoles('DOCTOR', 'ADMIN'), validate(createSchema), create);
router.post('/bulk', authenticateUser, authorizeRoles('DOCTOR', 'ADMIN'), validate(createManySchema), createMany);
router.get('/:doctorId/available', availableSlots);
router.get('/:doctorId/day', authenticateUser, authorizeRoles('DOCTOR', 'ADMIN', 'RECEPTIONIST'), getDay);
router.patch('/:doctorId/cancel-day', authenticateUser, authorizeRoles('DOCTOR', 'ADMIN', 'RECEPTIONIST'), cancelDay);

module.exports = router;
