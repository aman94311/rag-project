const express = require('express');
const router = express.Router();
const Document = require('../models/Document');
const Chat = require('../models/Chat');
const { protect } = require('../middleware/auth');
const { queryDocumentVectors } = require('../utils/pineconeHelper');
const { answerRAG } = require('../utils/gemini');

// @route   POST /api/chat/:documentId
// @desc    Ask a question about a document (Pinecone search -> Gemini strict RAG -> Save Chat)
// @access  Private
router.post('/:documentId', protect, async (req, res) => {
  try {
    const { question } = req.body;
    const { documentId } = req.params;

    if (!question) {
      return res.status(400).json({ success: false, message: 'Please provide a question' });
    }

    // Verify document exists and belongs to the user
    const doc = await Document.findOne({ _id: documentId, userId: req.user._id });
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found or access denied.' });
    }

    // Step 1: Query Pinecone vector database for matching text chunks
    const matchedChunks = await queryDocumentVectors(req.user._id, documentId, question, 5);

    let answerObj;
    if (matchedChunks.length === 0) {
      // Fallback response if Pinecone returned no chunks or is not configured
      answerObj = {
        answer: "I couldn't find this information in the uploaded document. (Reason: No document text context was retrieved)",
        citations: []
      };
    } else {
      // Step 2: Use Gemini API to answer the question using matching chunks as context
      answerObj = await answerRAG(question, matchedChunks);
    }

    // Step 3: Save user question and AI answer in MongoDB Chat history
    const chat = await Chat.create({
      userId: req.user._id,
      documentId,
      question,
      answer: answerObj.answer,
      citations: answerObj.citations
    });

    res.status(201).json({
      success: true,
      data: chat
    });

  } catch (error) {
    console.error('[Chat Route Error]:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/chat/:documentId
// @desc    Get chat history for a specific document
// @access  Private
router.get('/:documentId', protect, async (req, res) => {
  try {
    const { documentId } = req.params;

    // Verify document belongs to the user
    const doc = await Document.findOne({ _id: documentId, userId: req.user._id });
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found or access denied.' });
    }

    // Retrieve previous chats, sorted oldest to newest
    const chats = await Chat.find({
      userId: req.user._id,
      documentId
    }).sort({ timestamp: 1 });

    res.json({
      success: true,
      data: chats
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
