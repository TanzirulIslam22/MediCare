const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema(
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
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
    },
    diagnosis: { type: String, default: '' },
    medicines: {
      type: [
        {
          medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine' },
          nameSnapshot: { type: String, default: '' },
          dosage: { type: String, required: true },
          frequency: { type: String, required: true },
          durationDays: { type: Number, default: 1, min: 1 },
          instructions: { type: String, default: '' },
          dispensed: { type: Boolean, default: false },
          dispensedAt: { type: Date, default: null },
        },
      ],
      default: [],
    },
    notes: { type: String, default: '' },
    status: {
      type: String,
      enum: ['PENDING', 'PARTIALLY_DISPENSED', 'DISPENSED'],
      default: 'PENDING',
      index: true,
    },
  },
  { timestamps: true }
);

prescriptionSchema.index({ patientId: 1, createdAt: -1 });
prescriptionSchema.index({ appointmentId: 1 }, { unique: true });

prescriptionSchema.methods.canAccess = async function (user) {
  if (['ADMIN', 'PHARMACIST', 'RECEPTIONIST'].includes(user.role)) return true;
  if (user.role === 'PATIENT') {
    return user.patientId && this.patientId?.toString() === user.patientId;
  }
  if (user.role === 'DOCTOR') {
    return user.doctorId && this.doctorId?.toString() === user.doctorId;
  }
  return false;
};

module.exports = mongoose.model('Prescription', prescriptionSchema);
