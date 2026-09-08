const mongoose = require('mongoose');
const { QUEUE_STATUSES } = require('../config');

const queueEntrySchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    queueNumber: { type: Number, required: true },
    status: { type: String, enum: QUEUE_STATUSES, default: 'WAITING' },
    checkInTime: { type: Date, default: Date.now },
    calledAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    isEmergency: { type: Boolean, default: false },
  },
  { _id: false }
);

const queueSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
    },
    date: { type: Date, required: true },
    nextQueueNumber: { type: Number, default: 1 },
    entries: { type: [queueEntrySchema], default: [] },
  },
  { timestamps: true }
);

queueSchema.index({ doctorId: 1, date: 1 }, { unique: true });

queueSchema.methods.orderedEntries = function () {
  const order = { CALLED: 0, IN_CONSULTATION: 1, WAITING: 2, SKIPPED: 3, COMPLETED: 4, NO_SHOW: 5, CANCELLED: 6 };
  return [...this.entries]
    .filter((e) => ['WAITING', 'CALLED', 'IN_CONSULTATION'].includes(e.status))
    .sort((a, b) => {
      const pa = order[a.status] - order[b.status];
      if (pa !== 0) return pa;
      if (a.isEmergency !== b.isEmergency) return a.isEmergency ? -1 : 1;
      return a.queueNumber - b.queueNumber;
    });
};

module.exports = mongoose.model('Queue', queueSchema);
