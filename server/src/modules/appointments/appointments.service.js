const Schedule = require('../../models/schedule.model');
const Doctor = require('../../models/doctor.model');
const Patient = require('../../models/patient.model');
const Appointment = require('../../models/appointment.model');
const Queue = require('../../models/queue.model');
const ApiError = require('../../utils/ApiError');
const { runInTransaction } = require('../../utils/transaction');
const { sameCalendarDay, startOfDay } = require('../../utils/date');
const { notifyUser } = require('../../services/notification.service');

function parseDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw ApiError.badRequest('Invalid date', 'INVALID_DATE');
  return startOfDay(d);
}

const toMins = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

/**
 * Conditionally release a claimed slot back to AVAILABLE — but only while no
 * appointment is linked to it. Under a booking race the loser compensates here;
 * if the winner has already linked its appointment, this matches nothing and the
 * winner's state is left untouched.
 */
async function releaseSlot(scheduleId, slotTime) {
  return Schedule.updateOne(
    { _id: scheduleId, 'slots.time': slotTime, 'slots.appointmentId': null },
    { $set: { 'slots.$.status': 'AVAILABLE' } }
  );
}

/**
 * Link an appointment to a claimed slot. Guarded on `appointmentId: null` so the
 * winner always wins: even if the loser released the slot first, this re-books it.
 */
async function linkSlot(scheduleId, slotTime, appointmentId) {
  return Schedule.updateOne(
    { _id: scheduleId, 'slots.time': slotTime, 'slots.appointmentId': null },
    { $set: { 'slots.$.status': 'BOOKED', 'slots.$.appointmentId': appointmentId } }
  );
}

async function buildSnapshot(doctorId) {
  const doctor = await Doctor.findById(doctorId).populate('departmentId', 'name').populate('userId', 'fullName').lean();
  if (!doctor) throw ApiError.notFound('Doctor not found');
  return {
    name: doctor.userId?.fullName || '',
    department: doctor.departmentId?.name || '',
    fee: doctor.consultationFee || 0,
  };
}

async function notifyPatient(patientId, type, message, relatedId) {
  const patient = await Patient.findById(patientId).select('userId').lean();
  if (patient) await notifyUser(patient.userId, type, message, relatedId);
}

/** True when a Mongo duplicate-key error fires on the {scheduleId, slotTime} index. */
function isSlotConflictError(err) {
  return Boolean(
    err &&
      (err.code === 11000 || err.name === 'MongoServerError') &&
      err.keyPattern &&
      (err.keyPattern.scheduleId !== undefined || err.keyPattern.scheduleId)
  );
}

const service = {
  /**
   * Book an appointment atomically. The embedded `slots` array is the single
   * source of truth for slot state; the claim uses a conditional update that
   * only matches while the slot is AVAILABLE, so concurrent requests can never
   * double-book. The document + slot back-reference are created inside a
   * transaction on replica-set deployments for full rollback safety.
   */
  async book({ doctorId, scheduleId, slotTime, appointmentDate, reason, isFollowUp, parentAppointmentId }, actor) {
    let appointment;
    let claimed = false;
    try {
      appointment = await runInTransaction(async (session) => {
        const schedule = await Schedule.findById(scheduleId).session(session);
        if (!schedule) throw ApiError.notFound('Schedule not found');
        if (schedule.doctorId.toString() !== doctorId) {
          throw ApiError.badRequest('Schedule does not belong to that doctor', 'SCHEDULE_DOCTOR_MISMATCH');
        }
        if (schedule.isCancelled) {
          throw ApiError.conflict('This day is no longer available', 'SCHEDULE_CANCELLED');
        }
        const slot = schedule.slots.find((s) => s.time === slotTime);
        if (!slot) throw ApiError.badRequest('Slot not part of this schedule', 'SLOT_NOT_FOUND');
        if (toMins(slotTime) < toMins(schedule.startTime) || toMins(slotTime) >= toMins(schedule.endTime)) {
          throw ApiError.badRequest('Slot is outside working hours', 'SLOT_OUTSIDE_HOURS');
        }
        for (const brk of schedule.breaks) {
          if (toMins(slotTime) >= toMins(brk.start) && toMins(slotTime) < toMins(brk.end)) {
            throw ApiError.badRequest('Slot falls in a break', 'SLOT_IN_BREAK');
          }
        }
        const parsedDate = parseDate(appointmentDate);
        if (!sameCalendarDay(parsedDate, schedule.date)) {
          throw ApiError.badRequest('appointmentDate must match schedule date', 'DATE_MISMATCH');
        }

        // ATOM-1: claim the slot only if it is still AVAILABLE. `$elemMatch`
        // ensures the status condition applies to the SAME array element as the
        // time — plain dotted-field queries can match different elements.
        const claimedDoc = await Schedule.findOneAndUpdate(
          {
            _id: scheduleId,
            slots: { $elemMatch: { time: slotTime, status: 'AVAILABLE' } },
          },
          { $set: { 'slots.$.status': 'BOOKED' } },
          { session, new: true }
        );
        if (!claimedDoc) throw ApiError.conflict('This slot was just taken', 'SLOT_UNAVAILABLE');
        claimed = true;

        const patient = await Patient.findById(actor.patientId).session(session);
        if (!patient) throw ApiError.notFound('Patient profile not found');

        const snapshot = await buildSnapshot(doctorId);
        const created = await Appointment.create(
          [
            {
              patientId: patient._id,
              doctorId,
              scheduleId,
              slotTime,
              appointmentDate: parsedDate,
              reason,
              doctorSnapshot: snapshot,
              isFollowUp,
              parentAppointmentId: parentAppointmentId || null,
            },
          ],
          { session }
        );
        await linkSlot(scheduleId, slotTime, created[0]._id);
        return created[0];
      });
    } catch (err) {
      // If the loser of a race fails to create its appointment (unique index),
      // report a clean 409. The conditional releaseSlot is safe: it only frees
      // the slot while no appointment is linked to it.
      if (isSlotConflictError(err)) {
        throw ApiError.conflict('This slot was just taken', 'SLOT_UNAVAILABLE');
      }
      if (claimed) {
        try {
          await releaseSlot(scheduleId, slotTime);
        } catch (_) {
          /* ignore */
        }
      }
      throw err;
    }

    await notifyPatient(
      actor.patientId,
      'APPOINTMENT_BOOKED',
      `Appointment booked for ${appointment.doctorSnapshot.name} on ${require('../../utils/date').toDateOnlyString(appointment.appointmentDate)} at ${appointment.slotTime}`,
      appointment._id
    );
    return appointment;
  },

  async cancel(appointmentId, actor, reason) {
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) throw ApiError.notFound('Appointment not found');
    if (['COMPLETED', 'CANCELLED'].includes(appointment.status)) {
      throw ApiError.conflict('Appointment cannot be cancelled', 'INVALID_STATUS');
    }
    const ownerOk =
      (actor.role === 'PATIENT' && appointment.patientId.toString() === actor.patientId) ||
      ['RECEPTIONIST', 'ADMIN'].includes(actor.role);
    if (!ownerOk) throw ApiError.forbidden('You cannot cancel this appointment');

    await runInTransaction(async (session) => {
      appointment.status = 'CANCELLED';
      appointment.cancelledBy = actor.role;
      appointment.cancelReason = reason || '';
      await appointment.save({ session });
      await Schedule.updateOne(
        { _id: appointment.scheduleId, 'slots.time': appointment.slotTime },
        {
          $set: {
            'slots.$.status': 'AVAILABLE',
            'slots.$.appointmentId': null,
          },
        },
        { session }
      );
      await Queue.updateOne(
        { 'entries.appointmentId': appointment._id },
        { $set: { 'entries.$.status': 'CANCELLED' } },
        { session }
      );
    });
    return appointment;
  },

  async reschedule(appointmentId, actor, { newScheduleId, newSlotTime, newAppointmentDate }) {
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) throw ApiError.notFound('Appointment not found');
    const ownerOk =
      (actor.role === 'PATIENT' && appointment.patientId.toString() === actor.patientId) ||
      actor.role === 'RECEPTIONIST';
    if (!ownerOk) throw ApiError.forbidden('You cannot reschedule this appointment');
    if (['COMPLETED', 'CANCELLED', 'CHECKED_IN', 'IN_CONSULTATION'].includes(appointment.status)) {
      throw ApiError.conflict('Appointment cannot be rescheduled in its current state', 'INVALID_STATUS');
    }

    let claimedNewSlot = false;
    try {
      await runInTransaction(async (session) => {
        const schedule = await Schedule.findById(newScheduleId).session(session);
        if (!schedule) throw ApiError.notFound('New schedule not found');
        if (schedule.isCancelled) throw ApiError.conflict('New schedule is cancelled', 'SCHEDULE_CANCELLED');
        if (!sameCalendarDay(parseDate(newAppointmentDate), schedule.date)) {
          throw ApiError.badRequest('newAppointmentDate must match new schedule date', 'DATE_MISMATCH');
        }
        const claimed = await Schedule.findOneAndUpdate(
          {
            _id: newScheduleId,
            slots: { $elemMatch: { time: newSlotTime, status: 'AVAILABLE' } },
          },
          { $set: { 'slots.$.status': 'BOOKED' } },
          { session, new: true }
        );
        if (!claimed) throw ApiError.conflict('New slot just taken', 'SLOT_UNAVAILABLE');
        claimedNewSlot = true;

        await Schedule.updateOne(
          { _id: appointment.scheduleId, 'slots.time': appointment.slotTime },
          { $set: { 'slots.$.status': 'AVAILABLE', 'slots.$.appointmentId': null } },
          { session }
        );

        appointment.scheduleId = newScheduleId;
        appointment.slotTime = newSlotTime;
        appointment.appointmentDate = parseDate(newAppointmentDate);
        await appointment.save({ session });
        await linkSlot(newScheduleId, newSlotTime, appointment._id);
      });
    } catch (err) {
      if (isSlotConflictError(err)) {
        throw ApiError.conflict('New slot just taken', 'SLOT_UNAVAILABLE');
      }
      if (claimedNewSlot) {
        try {
          await releaseSlot(newScheduleId, newSlotTime);
        } catch (_) {
          /* ignore */
        }
      }
      throw err;
    }
    return appointment;
  },

  async checkIn(appointmentId, actor) {
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) throw ApiError.notFound('Appointment not found');
    if (appointment.status === 'CANCELLED' || appointment.status === 'NO_SHOW') {
      throw ApiError.conflict('Appointment cannot be checked in', 'INVALID_STATUS');
    }

    await runInTransaction(async (session) => {
      appointment.status = 'CHECKED_IN';
      await appointment.save({ session });

      // Atomically assign the next queue number via the counter field.
      const queue = await Queue.findOneAndUpdate(
        { doctorId: appointment.doctorId, date: appointment.appointmentDate },
        { $setOnInsert: { doctorId: appointment.doctorId, date: appointment.appointmentDate, nextQueueNumber: 1 } },
        { upsert: true, new: true, session }
      );
      const num = queue.nextQueueNumber;
      await Queue.updateOne(
        { _id: queue._id },
        {
          $push: {
            entries: {
              appointmentId: appointment._id,
              patientId: appointment.patientId,
              queueNumber: num,
              status: 'WAITING',
              isEmergency: false,
            },
          },
          $inc: { nextQueueNumber: 1 },
        },
        { session }
      );
    });
    return Appointment.findById(appointmentId);
  },

  async listMine(actor, query) {
    const { page = 1, limit = 20, status } = query;
    const filter = {};
    if (actor.role === 'PATIENT') filter.patientId = actor.patientId;
    else if (actor.role === 'DOCTOR') filter.doctorId = actor.doctorId;
    if (status) filter.status = status;
    const skip = (page - 1) * limit;
    const [docs, total] = await Promise.all([
      Appointment.find(filter)
        .populate({ path: 'patientId', select: 'userId gender dateOfBirth', populate: { path: 'userId', select: 'fullName phone' } })
        .sort({ appointmentDate: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .lean(),
      Appointment.countDocuments(filter),
    ]);
    return { items: docs, pagination: { page: +page, limit: +limit, total, totalPages: Math.ceil(total / limit) || 1 } };
  },
};

module.exports = service;
