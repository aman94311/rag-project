/**
 * Chunks extracted page text into 500-800 character blocks with overlap.
 * 
 * @param {Array<{pageIndex: number, text: string}>} pages 
 * @param {number} minSize - minimum characters per chunk
 * @param {number} maxSize - maximum characters per chunk
 * @param {number} overlap - overlap character count between consecutive chunks
 * @returns {Array<{text: string, page: number}>}
 */
const chunkText = (pages, minSize = 500, maxSize = 800, overlap = 150) => {
  const chunks = [];

  for (const page of pages) {
    const text = page.text.replace(/\s+/g, ' ').trim(); // Normalize spaces
    const pageIndex = page.pageIndex;

    if (text.length === 0) continue;

    // If the entire page's text fits within the max chunk size, keep it as one chunk
    if (text.length <= maxSize) {
      chunks.push({
        text,
        page: pageIndex
      });
      continue;
    }

    let start = 0;
    while (start < text.length) {
      let end = start + maxSize;

      // Adjust boundaries to end at a word boundary
      if (end < text.length) {
        const lastSpace = text.lastIndexOf(' ', end);
        // Ensure we don't shrink the chunk too much (keep it above minSize)
        if (lastSpace > start + minSize) {
          end = lastSpace;
        }
      } else {
        end = text.length;
      }

      const chunkTextContent = text.substring(start, end).trim();
      if (chunkTextContent.length > 0) {
        chunks.push({
          text: chunkTextContent,
          page: pageIndex
        });
      }

      // Move forward by size - overlap
      start = end - overlap;

      // If the remaining text is too small to form a meaningful new chunk,
      // append it or capture it and break
      if (start >= text.length - minSize) {
        const remainingText = text.substring(end - overlap).trim();
        if (remainingText.length > 0 && remainingText.length >= 100) {
          chunks.push({
            text: remainingText,
            page: pageIndex
          });
        }
        break;
      }
    }
  }

  return chunks;
};

module.exports = { chunkText };
