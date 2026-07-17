const pdf = require('pdf-parse');
const mammoth = require('mammoth');

/**
 * Extracts text page-by-page from a PDF buffer.
 * @param {Buffer} fileBuffer 
 * @returns {Promise<Array<{pageIndex: number, text: string}>>}
 */
const extractPdfTextByPage = async (fileBuffer) => {
  const pages = [];
  
  const options = {
    pagerender: function (pageData) {
      return pageData.getTextContent()
        .then((textContent) => {
          let text = '';
          let lastY;
          for (let item of textContent.items) {
            // Add newlines when text moves to a new vertical line
            if (lastY !== undefined && lastY !== item.transform[5]) {
              text += '\n';
            }
            text += item.str + ' ';
            lastY = item.transform[5];
          }
          pages.push({
            pageIndex: pageData.pageIndex, // pageIndex starts at 1 in pdf-parse options
            text: text.trim()
          });
          return text;
        });
    }
  };

  await pdf(fileBuffer, options);
  
  // Sort pages to ensure they are sequential
  pages.sort((a, b) => a.pageIndex - b.pageIndex);
  return pages;
};

/**
 * Extracts text from a DOCX buffer.
 * Since DOCX files don't have natural physical page breaks, we return all text as page 1.
 * @param {Buffer} fileBuffer 
 * @returns {Promise<Array<{pageIndex: number, text: string}>>}
 */
const extractDocxText = async (fileBuffer) => {
  const result = await mammoth.extractRawText({ buffer: fileBuffer });
  return [{ pageIndex: 1, text: result.value.trim() }];
};

/**
 * Main extractor that dispatches based on file extension/mimetype.
 * @param {Buffer} fileBuffer 
 * @param {string} originalName 
 * @returns {Promise<Array<{pageIndex: number, text: string}>>}
 */
const extractText = async (fileBuffer, originalName) => {
  const ext = originalName.split('.').pop().toLowerCase();
  if (ext === 'pdf') {
    return await extractPdfTextByPage(fileBuffer);
  } else if (ext === 'docx') {
    return await extractDocxText(fileBuffer);
  } else {
    throw new Error('Unsupported file format. Only PDF and DOCX are allowed.');
  }
};

module.exports = {
  extractText,
  extractPdfTextByPage,
  extractDocxText
};
