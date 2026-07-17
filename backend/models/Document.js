const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  uploadDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['processing', 'processed', 'failed'],
    default: 'processing'
  },
  pageCount: {
    type: Number,
    default: 0
  },
  // AI-generated metadata features
  summary: {
    type: String,
    default: ''
  },
  keywords: {
    type: [String],
    default: []
  },
  importantDates: {
    type: [String],
    default: []
  },
  importantNames: {
    type: [String],
    default: []
  }
});

module.exports = mongoose.model('Document', DocumentSchema);
