import multer from 'multer';
import pdfParse from 'pdf-parse';

// Disable Next.js default body parsing to let multer handle multipart form data.
export const config = {
  api: {
    bodyParser: false,
  },
};

// Set up multer to parse incoming multipart/form-data in memory.
const upload = multer();

// Utility function to run middleware in Next.js API routes.
function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res
      .status(405)
      .json({ error: `Method ${req.method} not allowed` });
  }

  try {
    // Run the multer middleware.
    await runMiddleware(req, res, upload.single('file'));

    // Check if a file was uploaded.
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Extract text from the uploaded PDF file using pdf-parse.
    const buffer = req.file.buffer;
    const data = await pdfParse(buffer);

    res.status(200).json({ text: data.text });
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    res
      .status(500)
      .json({ error: 'Failed to extract text from PDF', details: error.message });
  }
}
