const router = require('express').Router();
const { authenticateUser, authorizeRoles } = require('../../middlewares/auth');
const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/ApiResponse');
const ApiError = require('../../utils/ApiError');
const { validate } = require('../../utils/validate');
const { z } = require('zod');
const { auditLog } = require('../../services/audit.service');
const Queue = require('../../models/queue.model');
const Appointment = require('../../models/appointment.model');
const Patient = require('../../models/patient.model');
const User = require('../../models/user.model');
const { notifyUser } = require('../../services/notification.service');

const statusSchema = z.object({
  status: z.enum(['CALLED', 'IN_CONSULTATION', 'COMPLETED', 'SKIPPED', 'NO_SHOW', 'WAITING']),
});

function dayStart(date) {
  const d = date ? new Date(date) : new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

async function enrich(entries) {
  const patientIds = [...new Set(entries.map((e) => e.patientId?.toString()))];
  const profiles = await Patient.find({ _id: { $in: patientIds } }).select('userId').lean();
  const userMap = await User.find({ _id: { $in: profiles.map((p) => p.userId) } })
    .select('fullName phone')
    .lean();
  const userById = new Map(userMap.map((u) => [u._id.toString(), u]));
  const userIdByPatient = new Map(profiles.map((p) => [p._id.toString(), p.userId?.toString()]));
  return entries.map((e) => {
    const uid = userIdByPatient.get(e.patientId?.toString());
    const u = uid ? userById.get(uid) : null;
    return { ...e, patientName: u?.fullName || 'Unknown', patientPhone: u?.phone || '' };
  });
}

const getQueue = asyncHandler(async (req, res) => {
  const doctorId = req.params.doctorId;
  const date = dayStart(req.query.date);
  const isDoctorOwner = req.user.role === 'DOCTOR' && req.user.doctorId === doctorId;
  if (req.user.role === 'DOCTOR' && !isDoctorOwner) {
    throw ApiError.forbidden('Not your queue');
  }
  const queue = await Queue.findOne({ doctorId, date }).lean();
  if (!queue) return ok(res, { doctorId, date, entries: [], nextQueueNumber: 1 });
  const ordered = queue.orderedEntries().map((e, i) => ({ ...e, position: i + 1 }));
  const enrichedEntries = await enrich(ordered);
  return ok(res, { ...queue, entries: enrichedEntries });
});

const callNext = asyncHandler(async (req, res) => {
  const doctorId = req.params.doctorId;
  const date = dayStart();
  if (req.user.role === 'DOCTOR' && req.user.doctorId !== doctorId) {
    throw ApiError.forbidden('Not your queue');
  }
  const queue = await Queue.findOneAndUpdate(
    { doctorId, date },
    { $setOnInsert: { nextQueueNumber: 1 } },
    { upsert: true, new: true }
  );

  const waiting = queue.entries
    .filter((e) => e.status === 'WAITING')
    .sort((a, b) => {
      if (a.isEmergency !== b.isEmergency) return a.isEmergency ? -1 : 1;
      return a.queueNumber - b.queueNumber;
    });

  if (waiting.length === 0) throw ApiError.conflict('No patients waiting', 'EMPTY_QUEUE');
  const next = waiting[0];
  await Queue.updateOne(
    { _id: queue._id, 'entries.queueNumber': next.queueNumber },
    { $set: { 'entries.$.status': 'CALLED', 'entries.$.calledAt': new Date() } }
  );

  const appt = await Appointment.findById(next.appointmentId).select('patientId').lean();
  if (appt) {
    const patient = await Patient.findById(appt.patientId).select('userId').lean();
    if (patient) {
      await notifyUser(patient.userId, 'QUEUE_CALLED', `Doctor called your number. Please proceed to the room.`);
    }
  }
  await auditLog({
    req,
    actorId: req.user.id,
    actorRole: req.user.role,
    action: 'QUEUE_CALLED_NEXT',
    metadata: { doctorId, queueNumber: next.queueNumber, appointmentId: next.appointmentId },
  });
  return ok(res, { called: next }, 'Next patient called');
});

const updateEntryStatus = asyncHandler(async (req, res) => {
  const { appointmentId } = req.params;
  const { status } = req.body;

  const queue = await Queue.findOne({ 'entries.appointmentId': appointmentId });
  if (!queue) throw ApiError.notFound('Queue entry not found');
  const isDoctorOwner = req.user.role === 'DOCTOR' && queue.doctorId.toString() === req.user.doctorId;
  if (req.user.role === 'DOCTOR' && !isDoctorOwner) throw ApiError.forbidden('Not your queue');

  const entry = queue.entries.find((e) => e.appointmentId.toString() === appointmentId);
  if (!entry) throw ApiError.notFound('Queue entry not found');

  const set = { 'entries.$.status': status };
  if (status === 'IN_CONSULTATION') {
    set['entries.$.calledAt'] = new Date();
  }
  if (status === 'COMPLETED') {
    set['entries.$.completedAt'] = new Date();
  }
  await Queue.updateOne({ _id: queue._id, 'entries.appointmentId': appointmentId }, { $set: set });

  if (status === 'IN_CONSULTATION' || status === 'COMPLETED') {
    await Appointment.updateOne(
      { _id: appointmentId },
      { $set: { status: status === 'IN_CONSULTATION' ? 'IN_CONSULTATION' : 'COMPLETED' } }
    );
  }
  if (status === 'NO_SHOW') {
    await Appointment.updateOne({ _id: appointmentId }, { $set: { status: 'NO_SHOW' } });
  }
  await auditLog({
    req,
    actorId: req.user.id,
    actorRole: req.user.role,
    action: 'QUEUE_STATUS_UPDATED',
    metadata: { appointmentId, status },
  });
  return ok(res, { appointmentId, status }, 'Queue status updated');
});

const addEmergency = asyncHandler(async (req, res) => {
  const doctorId = req.params.doctorId;
  const { patientId } = req.body;
  const date = dayStart();
  const queue = await Queue.findOneAndUpdate(
    { doctorId, date },
    { $setOnInsert: { doctorId, date, nextQueueNumber: 1 } },
    { upsert: true, new: true }
  );
  const num = queue.nextQueueNumber;
  await Queue.updateOne(
    { _id: queue._id },
    {
      $push: {
        entries: { appointmentId: null, patientId, queueNumber: num, status: 'WAITING', isEmergency: true },
      },
      $inc: { nextQueueNumber: 1 },
    }
  );
  return ok(res, { queueNumber: num, isEmergency: true }, 'Emergency patient added', 201);
});

router.get('/:doctorId', authenticateUser, authorizeRoles('DOCTOR', 'RECEPTIONIST', 'ADMIN'), getQueue);
router.patch('/:doctorId/call-next', authenticateUser, authorizeRoles('DOCTOR', 'RECEPTIONIST'), callNext);
router.patch('/entries/:appointmentId/status', authenticateUser, authorizeRoles('DOCTOR', 'RECEPTIONIST'), validate(statusSchema), updateEntryStatus);
router.post('/:doctorId/emergency', authenticateUser, authorizeRoles('RECEPTIONIST'), addEmergency);

module.exports = router;
