const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    genericName: { type: String, default: '', index: true },
    category: { type: String, default: 'GENERAL' },
    manufacturer: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, default: 0, min: 0 },
    minStock: { type: Number, default: 10, min: 0 },
    batchNumber: { type: String, default: '' },
    expiryDate: { type: Date, default: null, index: true },
    supplier: { type: String, default: '' },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE', index: true },
  },
  { timestamps: true }
);

medicineSchema.index({ stock: 1 });
medicineSchema.index({ name: 'text', genericName: 'text' });

medicineSchema.methods.toSafeJSON = function () {
  return this.toObject();
};

module.exports = mongoose.model('Medicine', medicineSchema);
