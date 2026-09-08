const mongoose = require('mongoose');

const medicalRecordSchema = new mongoose.Schema(
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
    symptoms: { type: [String], default: [] },
    diagnosis: { type: String, required: true },
    clinicalNotes: { type: String, default: '' },
    testsRecommended: { type: [String], default: [] },
    treatmentNotes: { type: String, default: '' },
    followUpInstructions: { type: String, default: '' },
    isFinalized: { type: Boolean, default: false },
    editHistory: {
      type: [
        {
          editedAt: { type: Date, default: Date.now },
          editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          changeSummary: { type: String, default: '' },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

medicalRecordSchema.index({ patientId: 1, createdAt: -1 });
medicalRecordSchema.index({ doctorId: 1, createdAt: -1 });
medicalRecordSchema.index({ appointmentId: 1 }, { unique: true });

medicalRecordSchema.methods.canAccess = async function (user) {
  if (user.role === 'ADMIN') return true;
  if (user.role === 'PATIENT') {
    return user.patientId && this.patientId?.toString() === user.patientId;
  }
  if (user.role === 'DOCTOR') {
    if (user.doctorId && this.doctorId?.toString() === user.doctorId) return true;
    // Continuity of care: any doctor with an active appointment for this patient.
    const Appointment = mongoose.model('Appointment');
    const active = await Appointment.findOne({
      patientId: this.patientId,
      doctorId: user.doctorId,
      status: { $in: ['BOOKED', 'CHECKED_IN', 'IN_CONSULTATION'] },
    }).lean();
    return Boolean(active);
  }
  return false;
};

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema);
