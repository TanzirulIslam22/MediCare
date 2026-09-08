const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    staffType: {
      type: String,
      enum: ['RECEPTIONIST', 'PHARMACIST'],
      required: true,
      index: true,
    },
    shift: { type: String, default: 'DAY' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Staff', staffSchema);
