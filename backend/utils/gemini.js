const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini API client
let genAI;
const getGenAIClient = () => {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not defined. Gemini features will fail.');
      return null;
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
};

/**
 * Generates embeddings for a given text.
 * Uses gemini-embedding-001 which outputs 1024 dimensions.
 * @param {string} text 
 * @returns {Promise<Array<number>>}
 */
const generateEmbedding = async (text) => {
  const client = getGenAIClient();
  if (!client) {
    throw new Error('Gemini API client not initialized. Check GEMINI_API_KEY.');
  }

  const model = client.getGenerativeModel({ model: 'gemini-embedding-001' });
  const result = await model.embedContent({
    content: { parts: [{ text }] },
    outputDimensionality: 1024
  });
  
  if (result && result.embedding && result.embedding.values) {
    return result.embedding.values;
  } else {
    throw new Error('Failed to generate embedding from Gemini API.');
  }
};

/**
 * Automatically generates a summary, keywords, important dates, and names from text.
 * Uses gemini-3.1-flash-lite with JSON mode output.
 * @param {string} documentText 
 * @returns {Promise<{summary: string, keywords: Array<string>, importantDates: Array<string>, importantNames: Array<string>}>}
 */
const generateMetadataFeatures = async (documentText) => {
  const client = getGenAIClient();
  if (!client) {
    return {
      summary: 'API Key missing. Cannot generate summary.',
      keywords: [],
      importantDates: [],
      importantNames: []
    };
  }

  try {
    const model = client.getGenerativeModel({
      model: 'gemini-3.1-flash-lite',
      generationConfig: { responseMimeType: 'application/json' }
    });

    // Truncate text to avoid token limits (first ~20,000 characters)
    const sampleText = documentText.substring(0, 20000);

    const prompt = `Analyze the following document text and return a JSON object with these exact fields:
{
  "summary": "A clear, professional 2-3 sentence summary of the document contents.",
  "keywords": ["5 to 8 relevant keywords or key terms"],
  "importantDates": ["List key dates mentioned in the text with context, e.g., 'Jan 2026: Project Launch'. Limit to 5. Return empty list if none."],
  "importantNames": ["List key people, institutions, organizations, or major products/technologies. Limit to 5. Return empty list if none."]
}

Document Text:
${sampleText}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const jsonText = response.text();
    return JSON.parse(jsonText);
  } catch (error) {
    console.error('Error generating document metadata features:', error);
    return {
      summary: 'Failed to generate document features automatically.',
      keywords: [],
      importantDates: [],
      importantNames: []
    };
  }
};

/**
 * Performs strict RAG answering.
 * Uses gemini-3.1-flash-lite with a strict prompt and context input.
 * @param {string} question 
 * @param {Array<{text: string, page: number, index: number}>} contextChunks 
 * @returns {Promise<{answer: string, citations: Array<{text: string, page: number, paragraph: number}>}>}
 */
const answerRAG = async (question, contextChunks) => {
  const client = getGenAIClient();
  if (!client) {
    return {
      answer: 'Gemini API client not initialized. Please verify your GEMINI_API_KEY.',
      citations: []
    };
  }

  // Format the context with clear markers for the LLM
  const formattedContext = contextChunks
    .map((chunk, i) => `[Source Chunk ${i + 1} - Page ${chunk.page}, Paragraph ${chunk.paragraph || 'N/A'}]:\n"${chunk.text}"`)
    .join('\n\n');

  const prompt = `You are a helpful and intelligent AI assistant. Your task is to answer the user's question based on the provided Text Context.

Please follow these guidelines to provide a high-quality response:
1. **Semantic & Pattern Matching**: Be flexible and search for semantic patterns in the context. For example, if the user asks about "12th" or "12th class", check if the document mentions "XII", "Class 12", "Senior Secondary", "Intermediate", "High School", or similar phrasings. Do not reject the query just because the literal word "12th" isn't present.
2. **Language & Tone**: Respond in the same language and tone as the question. If the user asks in Hindi/Hinglish (e.g., "12th kaha se kiya"), answer politely in Hindi/Hinglish.
3. **Conversational yet Grounded**: Be polite and natural rather than sounding like a rigid robot. Keep your answer strictly grounded in the facts mentioned in the Text Context. Do not invent any outside facts or make wild assumptions.
4. **Handling Missing Info**: If the context absolutely does not contain any relevant information, state politely (in the user's query language) that you couldn't find this specific detail in the document.
5. **Citations**: For your answers, include the citation referencing the page/paragraph number where you found it (e.g. "[Page X, Paragraph Y]" or "[Page X]").

Text Context:
${formattedContext}

Question:
${question}

Answer:`;

  try {
    const model = client.getGenerativeModel({ model: 'gemini-3.1-flash-lite' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const answer = response.text().trim();

    // Map matched sources to formal citation references
    // We only return the citations that the LLM could have references to
    const citations = contextChunks.map(c => ({
      text: c.text,
      page: c.page,
      paragraph: c.paragraph || 1
    }));

    return {
      answer,
      citations
    };
  } catch (error) {
    console.error('Error in answerRAG:', error);
    return {
      answer: `Error generating response: ${error.message}`,
      citations: []
    };
  }
};

module.exports = {
  generateEmbedding,
  generateMetadataFeatures,
  answerRAG
};
