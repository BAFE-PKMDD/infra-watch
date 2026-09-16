const fs = require('fs');

async function testPdf() {
  try {
    const { PDFParse } = await import('pdf-parse');
    
    // Create a dummy PDF buffer (minimal valid PDF)
    const pdfBuffer = Buffer.from(
      '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources <<>> /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 21 >>\nstream\nBT\n/F1 24 Tf\n100 700 Td\n(Test) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000219 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n289\n%%EOF',
      'utf8'
    );
    
    console.log("PDFParse:", Object.keys(PDFParse));
    
    // Try to disable worker
    if (PDFParse.setWorker) {
      console.log("Setting worker to empty string");
      try {
        PDFParse.setWorker('');
      } catch (e) {
        console.error("setWorker failed:", e);
      }
    }
    
    const parser = new PDFParse({ data: pdfBuffer, useWorkerFetch: false, worker: null });
    const result = await parser.getText();
    console.log("Text:", result.text);
    
  } catch (err) {
    console.error("Error:", err);
  }
}

testPdf();
