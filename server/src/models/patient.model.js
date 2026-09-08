const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    dateOfBirth: { type: Date, default: null },
    gender: { type: String, enum: ['MALE', 'FEMALE', 'OTHER'], default: 'OTHER' },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'UNKNOWN'],
      default: 'UNKNOWN',
    },
    address: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      district: { type: String, default: '' },
    },
    emergencyContact: {
      name: { type: String, default: '' },
      phone: { type: String, default: '' },
      relation: { type: String, default: '' },
    },
    allergies: { type: [String], default: [] },
    chronicConditions: { type: [String], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Patient', patientSchema);
