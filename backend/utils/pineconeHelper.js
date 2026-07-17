const { getIndex } = require('../config/pinecone');
const { generateEmbedding } = require('./gemini');

/**
 * Embeds chunks and upserts them to the Pinecone index.
 * 
 * @param {string} documentId 
 * @param {string} userId 
 * @param {Array<{text: string, page: number}>} chunks 
 * @returns {Promise<boolean>}
 */
const upsertDocumentVectors = async (documentId, userId, chunks) => {
  const index = getIndex();
  if (!index) {
    console.warn('[Pinecone] Index not configured. Skipping vector upsert.');
    return false;
  }

  console.log(`[Pinecone] Embedding and upserting ${chunks.length} chunks...`);
  const vectors = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    try {
      const embedding = await generateEmbedding(chunk.text);

      // Estimate paragraph number within this chunk by splitting newlines or just counting
      const paragraph = i + 1;

      vectors.push({
        id: `${documentId}_chunk_${i}`,
        values: embedding,
        metadata: {
          userId: userId.toString(),
          documentId: documentId.toString(),
          page: Number(chunk.page),
          paragraph: Number(paragraph),
          chunkText: chunk.text
        }
      });
    } catch (err) {
      console.error(`[Pinecone] Error embedding chunk index ${i}:`, err.message);
    }
  }

  if (vectors.length > 0) {
    // Pinecone allows batch upserting. We upsert in batches of 50 to avoid payload size errors
    const batchSize = 50;
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      await index.upsert(batch);
    }
    console.log(`[Pinecone] Successfully upserted ${vectors.length} vectors.`);
    return true;
  }

  return false;
};

/**
 * Queries Pinecone for top matching chunks for a user and document.
 * 
 * @param {string} userId 
 * @param {string} documentId 
 * @param {string} queryText 
 * @param {number} topK 
 * @returns {Promise<Array<{text: string, page: number, paragraph: number, score: number}>>}
 */
const queryDocumentVectors = async (userId, documentId, queryText, topK = 5) => {
  const index = getIndex();
  if (!index) {
    console.warn('[Pinecone] Index not configured. Skipping vector query.');
    return [];
  }

  try {
    const queryVector = await generateEmbedding(queryText);

    const queryResponse = await index.query({
      vector: queryVector,
      topK,
      includeMetadata: true,
      filter: {
        userId: { $eq: userId.toString() },
        documentId: { $eq: documentId.toString() }
      }
    });

    if (!queryResponse.matches) return [];

    return queryResponse.matches.map((match) => ({
      text: match.metadata.chunkText,
      page: Number(match.metadata.page),
      paragraph: Number(match.metadata.paragraph),
      score: match.score
    }));
  } catch (err) {
    console.error('[Pinecone] Query failed:', err.message);
    return [];
  }
};

/**
 * Deletes all vectors associated with a document from Pinecone.
 * 
 * @param {string} documentId 
 * @returns {Promise<boolean>}
 */
const deleteDocumentVectors = async (documentId) => {
  const index = getIndex();
  if (!index) {
    console.warn('[Pinecone] Index not configured. Skipping vector deletion.');
    return false;
  }

  try {
    console.log(`[Pinecone] Purging vectors for document ${documentId}...`);
    await index.deleteMany({
      filter: {
        documentId: { $eq: documentId.toString() }
      }
    });
    console.log(`[Pinecone] Successfully purged vectors for document ${documentId}.`);
    return true;
  } catch (err) {
    console.error(`[Pinecone] Vector deletion failed for document ${documentId}:`, err.message);
    return false;
  }
};

module.exports = {
  upsertDocumentVectors,
  queryDocumentVectors,
  deleteDocumentVectors
};
