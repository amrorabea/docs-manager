const mammoth = require('mammoth');

const extractTextFromWord = async (filePath) => {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } catch (error) {
    console.error('Error extracting text from Word file:', error);
    return null;
  }
};

module.exports = {
  extractTextFromWord
};