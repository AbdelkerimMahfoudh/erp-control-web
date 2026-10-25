import qrcode from 'qrcode-generator';

/**
 * A QR code drawn from its module matrix (0103, D221): the promoter's registration link, for the console's screen and
 * for the printable card. Medium error correction and the standard four-module quiet zone, black on white whatever the
 * theme — a camera reads contrast, not the page's colours. Encoded in the browser: the link never leaves this page.
 */

export interface QrMatrix {
  size: number;
  dark: (row: number, col: number) => boolean;
}

export const QUIET_ZONE = 4;

export function qrMatrix(text: string): QrMatrix {
  const qr = qrcode(0, 'M');
  qr.addData(text, 'Byte');
  qr.make();
  return { size: qr.getModuleCount(), dark: (r, c) => qr.isDark(r, c) };
}

/** One SVG path for every dark module: crisp at any size, and printable as vector. */
export function qrPath(m: QrMatrix): string {
  let d = '';
  for (let r = 0; r < m.size; r++) {
    for (let c = 0; c < m.size; c++) if (m.dark(r, c)) d += `M${c + QUIET_ZONE} ${r + QUIET_ZONE}h1v1h-1z`;
  }
  return d;
}

export function QrCode({ text, label, size = 220 }: { text: string; label: string; size?: number }) {
  const m = qrMatrix(text);
  const extent = m.size + QUIET_ZONE * 2;
  return (
    <svg className="qr" role="img" aria-label={label} width={size} height={size} viewBox={`0 0 ${extent} ${extent}`} shapeRendering="crispEdges">
      <rect width={extent} height={extent} fill="white" />
      <path d={qrPath(m)} fill="black" />
    </svg>
  );
}

/** The QR drawn onto a canvas at whole-pixel modules, for the downloadable card. */
export function drawQr(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number): void {
  const m = qrMatrix(text);
  const extent = m.size + QUIET_ZONE * 2;
  const cell = Math.floor(size / extent);
  const offset = Math.floor((size - cell * extent) / 2);
  ctx.fillStyle = 'white';
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = 'black';
  for (let r = 0; r < m.size; r++) {
    for (let c = 0; c < m.size; c++) {
      if (m.dark(r, c)) ctx.fillRect(x + offset + (c + QUIET_ZONE) * cell, y + offset + (r + QUIET_ZONE) * cell, cell, cell);
    }
  }
}
