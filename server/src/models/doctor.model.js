const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
      index: true,
    },
    specialization: { type: String, required: true, trim: true },
    qualifications: { type: [String], default: [] },
    experienceYears: { type: Number, min: 0, default: 0 },
    consultationFee: { type: Number, required: true, min: 0 },
    bio: { type: String, default: '' },
    isAcceptingAppointments: { type: Boolean, default: true },
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

doctorSchema.index({ departmentId: 1, specialization: 1 });
doctorSchema.index({ consultationFee: 1 });
doctorSchema.index({
  specialization: 'text',
  bio: 'text',
  qualifications: 'text',
});

doctorSchema.methods.toSafeJSON = function () {
  const obj = this.toObject();
  return obj;
};

module.exports = mongoose.model('Doctor', doctorSchema);
