"use client";

// Captures each A4 designer page as a PNG (client-side, via html-to-image) and
// assembles those images into a downloadable, watermarked PDF. jsPDF is
// dynamically imported so it stays out of the main bundle until an export is
// actually requested.

const WATERMARK_PATH = "/infra-watch-logo.png";
const WATERMARK_NATURAL_WIDTH = 263;
const WATERMARK_NATURAL_HEIGHT = 175;

export async function capturePageAsPng(element: HTMLElement, width: number, height: number): Promise<string> {
  const { toPng } = await import("html-to-image");
  await document.fonts?.ready;
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  return toPng(element, {
    backgroundColor: "#ffffff",
    cacheBust: true,
    pixelRatio: 2,
    width,
    height,
  });
}

async function loadImageAsDataUrl(path: string): Promise<string> {
  const response = await fetch(path);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read image"));
    reader.readAsDataURL(blob);
  });
}

export async function downloadDashboardAsPdf(pageImages: string[], filename: string) {
  const { jsPDF, GState } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const watermark = await loadImageAsDataUrl(WATERMARK_PATH).catch(() => null);
  const watermarkWidth = pageWidth * 0.75;
  const watermarkHeight = watermarkWidth * (WATERMARK_NATURAL_HEIGHT / WATERMARK_NATURAL_WIDTH);
  const watermarkX = (pageWidth - watermarkWidth) / 2;
  const watermarkY = (pageHeight - watermarkHeight) / 2;

  pageImages.forEach((image, index) => {
    if (index > 0) pdf.addPage();
    pdf.addImage(image, "PNG", 0, 0, pageWidth, pageHeight);
    if (watermark) {
      pdf.saveGraphicsState();
      pdf.setGState(new GState({ opacity: 0.05 }));
      pdf.addImage(watermark, "PNG", watermarkX, watermarkY, watermarkWidth, watermarkHeight);
      pdf.restoreGraphicsState();
    }
  });

  pdf.save(filename);
}
