type PdfPageSlice = {
  sourceY: number;
  sourceHeight: number;
};

export function createPdfPageSlices({
  canvasWidth,
  canvasHeight,
  pageWidth,
  pageHeight,
}: {
  canvasWidth: number;
  canvasHeight: number;
  pageWidth: number;
  pageHeight: number;
}): PdfPageSlice[] {
  if (![canvasWidth, canvasHeight, pageWidth, pageHeight].every((value) => Number.isFinite(value) && value > 0)) {
    return [];
  }

  const sourcePageHeight = Math.max(1, Math.floor((pageHeight / pageWidth) * canvasWidth));
  const slices: PdfPageSlice[] = [];
  for (let sourceY = 0; sourceY < canvasHeight; sourceY += sourcePageHeight) {
    slices.push({
      sourceY,
      sourceHeight: Math.min(sourcePageHeight, canvasHeight - sourceY),
    });
  }
  return slices;
}

export function aniaPdfFilename(asOf: string, answerNumber?: number) {
  const dateSuffix = /^\d{4}-\d{2}-\d{2}$/.test(asOf) ? `-${asOf}` : "";
  return answerNumber
    ? `ania-answer${dateSuffix}-${answerNumber}.pdf`
    : `ania-executive-brief${dateSuffix}.pdf`;
}

export async function createElementPdfBlob(element: HTMLElement) {
  await document.fonts?.ready;
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

  const [{ toCanvas }, { jsPDF }] = await Promise.all([
    import("html-to-image"),
    import("jspdf"),
  ]);

  const captureWidth = Math.max(element.scrollWidth, element.offsetWidth);
  const captureHeight = Math.max(element.scrollHeight, element.offsetHeight);
  const computedBackground = window.getComputedStyle(element).backgroundColor;
  const captureBackground = computedBackground === "rgba(0, 0, 0, 0)" || computedBackground === "transparent"
    ? "#ffffff"
    : computedBackground;
  const pixelRatio = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const canvas = await toCanvas(element, {
    backgroundColor: captureBackground,
    cacheBust: true,
    pixelRatio,
    width: captureWidth,
    height: captureHeight,
    style: {
      overflow: "visible",
    },
    filter: (node) => !(node instanceof HTMLElement && node.dataset.pdfExclude === "true"),
  });

  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4", compress: true });
  const margin = 20;
  const pageWidth = pdf.internal.pageSize.getWidth() - margin * 2;
  const pageHeight = pdf.internal.pageSize.getHeight() - margin * 2;
  const slices = createPdfPageSlices({
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
    pageWidth,
    pageHeight,
  });

  slices.forEach((slice, index) => {
    if (index > 0) pdf.addPage();
    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = canvas.width;
    pageCanvas.height = slice.sourceHeight;
    const context = pageCanvas.getContext("2d");
    if (!context) throw new Error("Unable to prepare the PDF page");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    context.drawImage(
      canvas,
      0,
      slice.sourceY,
      canvas.width,
      slice.sourceHeight,
      0,
      0,
      canvas.width,
      slice.sourceHeight,
    );
    const renderedHeight = (slice.sourceHeight / canvas.width) * pageWidth;
    pdf.addImage(
      pageCanvas.toDataURL("image/jpeg", 0.92),
      "JPEG",
      margin,
      margin,
      pageWidth,
      renderedHeight,
      undefined,
      "FAST",
    );
  });

  return pdf.output("blob");
}

export async function downloadElementAsPdf(element: HTMLElement, filename: string) {
  const blob = await createElementPdfBlob(element);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
