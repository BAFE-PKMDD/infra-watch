import 'server-only';

export async function extractText(buffer: Buffer, fileType: string): Promise<string> {
  let rawText = '';

  if (fileType === 'PDF') {
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      rawText = result.text;
    } finally {
      await parser.destroy();
    }
  } else if (fileType === 'TXT') {
    rawText = buffer.toString('utf-8');
  } else if (fileType === 'Markdown') {
    rawText = buffer.toString('utf-8');
  } else if (fileType === 'FAQ Entry') {
    throw new Error('FAQ entries do not require file extraction');
  } else {
    throw new Error(`Unsupported file type: ${fileType}`);
  }

  // Clean the extracted text: normalize Unicode, collapse excessive whitespace, trim
  const cleanedText = rawText
    .normalize()
    .replace(/\s+/g, ' ')
    .trim();

  if (cleanedText.length === 0) {
    throw new Error('No text content could be extracted from the file');
  }

  return cleanedText;
}
