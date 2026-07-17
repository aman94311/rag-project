const mongoose = require('mongoose');

const ChatSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true
  },
  question: {
    type: String,
    required: true
  },
  answer: {
    type: String,
    required: true
  },
  citations: [
    {
      text: String,
      page: Number,
      paragraph: Number
    }
  ],
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Chat', ChatSchema);
