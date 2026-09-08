const mongoose = require('mongoose');
const { SLOT_STATUSES } = require('../config');

const slotSchema = new mongoose.Schema(
  {
    time: { type: String, required: true },
    status: { type: String, enum: SLOT_STATUSES, default: 'AVAILABLE' },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null,
    },
  },
  { _id: false }
);

const scheduleSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
      index: true,
    },
    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    slotDurationMinutes: { type: Number, default: 15, min: 5 },
    breaks: {
      type: [{ start: String, end: String }],
      default: [],
    },
    isCancelled: { type: Boolean, default: false },
    slots: { type: [slotSchema], default: [] },
  },
  { timestamps: true }
);

scheduleSchema.index({ doctorId: 1, date: 1 }, { unique: true });
scheduleSchema.index({ date: 1, 'slots.status': 1 });

scheduleSchema.methods.generateSlots = function () {
  const toMinutes = (t) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  const toTime = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const start = toMinutes(this.startTime);
  const end = toMinutes(this.endTime);
  const duration = this.slotDurationMinutes;
  const slots = [];
  for (let t = start; t + duration <= end; t += duration) {
    slots.push({ time: toTime(t), status: 'AVAILABLE', appointmentId: null });
  }
  this.slots = slots;
  return this;
};

module.exports = mongoose.model('Schedule', scheduleSchema);
