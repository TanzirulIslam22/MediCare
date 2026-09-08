const mongoose = require('mongoose');
const { APPOINTMENT_STATUSES } = require('../config');

const appointmentSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
      index: true,
    },
    scheduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Schedule',
      required: true,
    },
    slotTime: { type: String, required: true },
    appointmentDate: { type: Date, required: true, index: true },
    reason: { type: String, default: '' },
    status: {
      type: String,
      enum: APPOINTMENT_STATUSES,
      default: 'BOOKED',
      index: true,
    },
    doctorSnapshot: {
      name: { type: String, default: '' },
      department: { type: String, default: '' },
      fee: { type: Number, default: 0 },
    },
    isFollowUp: { type: Boolean, default: false },
    parentAppointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null,
    },
    cancelledBy: {
      type: String,
      enum: ['PATIENT', 'RECEPTIONIST', 'DOCTOR', 'ADMIN'],
      default: null,
    },
    cancelReason: { type: String, default: '' },
  },
  { timestamps: true }
);

appointmentSchema.index({ doctorId: 1, appointmentDate: 1 });
appointmentSchema.index({ patientId: 1, appointmentDate: -1 });
appointmentSchema.index({ status: 1, appointmentDate: 1 });
appointmentSchema.index(
  { scheduleId: 1, slotTime: 1 },
  {
    unique: true,
    // Only enforce uniqueness among active appointments so a cancelled (or
    // no-show) record keeps its history without blocking slot re-booking.
    partialFilterExpression: { status: { $nin: ['CANCELLED', 'NO_SHOW'] } },
  }
);

appointmentSchema.methods.canAccess = function (user) {
  const selfId = this._id?.toString();
  const patientOk = user.patientId && this.patientId?.toString() === user.patientId;
  const doctorOk = user.doctorId && this.doctorId?.toString() === user.doctorId;
  const staffOk = ['RECEPTIONIST', 'ADMIN'].includes(user.role);
  return Boolean(patientOk || doctorOk || staffOk);
};

module.exports = mongoose.model('Appointment', appointmentSchema);
