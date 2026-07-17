const express = require('express');
const router = express.Router();
const multer = require('multer');
const Document = require('../models/Document');
const Chat = require('../models/Chat');
const { protect } = require('../middleware/auth');
const { extractText } = require('../utils/extractor');
const { chunkText } = require('../utils/chunker');
const { upsertDocumentVectors, deleteDocumentVectors } = require('../utils/pineconeHelper');
const { generateMetadataFeatures } = require('../utils/gemini');

// Configure Multer memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and DOCX documents are supported.'));
    }
  }
});

// @route   POST /api/documents/upload
// @desc    Upload & process document (Text extraction, Chunking, Pinecone vector indexing, AI feature generation)
// @access  Private
router.post('/upload', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a file' });
    }

    const fileName = req.file.originalname;
    console.log(`[Upload] Processing document "${fileName}" for user: ${req.user._id}`);

    // Step 1: Extract Text
    let pagesText;
    try {
      pagesText = await extractText(req.file.buffer, fileName);
    } catch (err) {
      return res.status(400).json({ success: false, message: `Text extraction failed: ${err.message}` });
    }

    const totalPages = pagesText.length;
    const fullText = pagesText.map(p => p.text).join('\n');

    // Step 2: Save document placeholder in MongoDB (processing status)
    const doc = await Document.create({
      userId: req.user._id,
      fileName,
      status: 'processing',
      pageCount: totalPages
    });

    // Send immediate response back to frontend (milestone requirement)
    // The client can poll or see progress while processing finishes in the background
    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully. Processing started in the background.',
      data: doc
    });

    // Step 3: Run processing in background
    (async () => {
      try {
        // A: Chunk text
        const chunks = chunkText(pagesText);
        
        // B: Generate Embeddings and Upsert to Pinecone
        const upsertSuccess = await upsertDocumentVectors(doc._id, req.user._id, chunks);

        // C: Extract AI Features (Summary, Keywords, Names, Dates) using Gemini
        const aiFeatures = await generateMetadataFeatures(fullText);

        // D: Update Document in Database
        doc.status = 'processed';
        doc.summary = aiFeatures.summary || 'Summary unavailable.';
        doc.keywords = aiFeatures.keywords || [];
        doc.importantDates = aiFeatures.importantDates || [];
        doc.importantNames = aiFeatures.importantNames || [];
        await doc.save();
        console.log(`[Upload] Processing finished successfully for document: ${doc._id}`);
      } catch (backgroundError) {
        console.error(`[Upload] Background processing error for document ${doc._id}:`, backgroundError);
        doc.status = 'failed';
        await doc.save().catch(e => console.error('Failed to save fail status:', e));
      }
    })();

  } catch (error) {
    console.error('[Upload Route] Error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/documents
// @desc    Retrieve all documents for logged-in user
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const documents = await Document.find({ userId: req.user._id }).sort({ uploadDate: -1 });
    
    // For each document, let's also aggregate the count of questions asked
    // We can map documents to include question count
    const documentsWithChatCount = await Promise.all(
      documents.map(async (doc) => {
        const chatCount = await Chat.countDocuments({ documentId: doc._id });
        return {
          ...doc.toObject(),
          questionsAsked: chatCount
        };
      })
    );

    res.json({
      success: true,
      data: documentsWithChatCount
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/documents/:id
// @desc    Delete document, related vector index, and all related chats
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, userId: req.user._id });
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    const docId = doc._id;

    // 1. Delete associated Pinecone vectors
    await deleteDocumentVectors(docId);

    // 2. Delete all chats linked to this document
    await Chat.deleteMany({ documentId: docId });

    // 3. Delete Document record
    await doc.deleteOne();

    res.json({
      success: true,
      message: 'Document and all associated chats and vectors deleted successfully.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/documents/:id/rename
// @desc    Rename an existing document filename
// @access  Private
router.put('/:id/rename', protect, async (req, res) => {
  try {
    const { fileName } = req.body;
    if (!fileName) {
      return res.status(400).json({ success: false, message: 'Please provide a file name' });
    }

    const doc = await Document.findOne({ _id: req.params.id, userId: req.user._id });
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    doc.fileName = fileName;
    await doc.save();

    res.json({
      success: true,
      message: 'Document renamed successfully',
      data: doc
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
