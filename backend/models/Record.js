/**
 * Record model - stores data parsed from Excel files
 * Each record has a unique ID for detail views
 */
const mongoose = require('mongoose');

const recordSchema = new mongoose.Schema(
  {
    // MongoDB _id is used as unique ID for detail views
    // Dynamic keys from Excel columns are stored in 'data'
    data: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sourceFile: {
      type: String,
      default: '',
    },
    rowIndex: {
      type: Number,
      default: 0,
    },
    // Region for filtering dashboard by login selection (set from Excel column when possible)
    region: {
      type: String,
      default: '',
      trim: true,
    },
    lastVisitDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    // Ensure we can store arbitrary Excel columns
    strict: false,
  }
);

// Convert Map to object when converting to JSON for API responses
recordSchema.methods.toJSON = function () {
  const obj = this.toObject();
  if (obj.data && obj.data instanceof Map) {
    obj.data = Object.fromEntries(obj.data);
  }
  return obj;
};

module.exports = mongoose.model('Record', recordSchema);
