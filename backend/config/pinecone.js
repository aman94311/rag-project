const { Pinecone } = require('@pinecone-database/pinecone');

let pc = null;

const getPineconeClient = () => {
  if (!pc) {
    const apiKey = process.env.PINECONE_API_KEY;
    if (!apiKey) {
      console.warn('PINECONE_API_KEY is not defined in environment variables.');
      return null;
    }
    pc = new Pinecone({ apiKey });
  }
  return pc;
};

const getIndex = () => {
  const client = getPineconeClient();
  if (!client) return null;
  const indexName = process.env.PINECONE_INDEX_NAME;
  if (!indexName) {
    console.warn('PINECONE_INDEX_NAME is not defined in environment variables.');
    return null;
  }
  return client.Index(indexName);
};

module.exports = { getPineconeClient, getIndex };
