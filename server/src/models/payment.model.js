const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    method: {
      type: String,
      enum: ['CASH', 'CARD', 'MOBILE_BANKING', 'INSURANCE'],
      default: 'CASH',
    },
    referenceId: { type: String, default: null },
    status: {
      type: String,
      enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'],
      default: 'PENDING',
      index: true,
    },
    paidAt: { type: Date, default: null },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    note: { type: String, default: '' },
  },
  { timestamps: true }
);

paymentSchema.index({ patientId: 1, status: 1 });
paymentSchema.index({ referenceId: 1 }, { unique: true, partialFilterExpression: { referenceId: { $type: 'string' } } });

module.exports = mongoose.model('Payment', paymentSchema);
