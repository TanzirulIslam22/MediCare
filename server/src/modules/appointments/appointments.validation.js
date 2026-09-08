const { z } = require('zod');

const bookSchema = z.object({
  doctorId: z.string().min(1),
  scheduleId: z.string().min(1),
  slotTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  appointmentDate: z.string().min(1),
  reason: z.string().max(500).optional().default(''),
  isFollowUp: z.boolean().optional().default(false),
  parentAppointmentId: z.string().optional().nullable(),
});

const rescheduleSchema = z.object({
  newScheduleId: z.string().min(1),
  newSlotTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  newAppointmentDate: z.string().min(1),
});

const cancelSchema = z.object({
  reason: z.string().max(500).optional().default(''),
});

module.exports = { bookSchema, rescheduleSchema, cancelSchema };
