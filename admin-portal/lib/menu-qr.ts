import QRCode from 'qrcode';

/**
 * Client-side QR generation for Kuza Menu (the backend intentionally 501s
 * its /menu-sites/qr endpoint — this is the supported path).
 * Produces table-tent-ready cards: QR + venue name caption + URL.
 */

const CARD_W = 1200;
const CARD_H = 1560;
const QR_SIZE = 880;

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** PNG table-tent card as a data URL (1200×1560, print-friendly). */
export async function generateQrCardPng(
  url: string,
  venueName: string,
): Promise<string> {
  const qrDataUrl = await QRCode.toDataURL(url, {
    width: QR_SIZE,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#111111', light: '#FFFFFF' },
  });

  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  // Card
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 6;
  ctx.strokeRect(40, 40, CARD_W - 80, CARD_H - 80);

  // Venue name
  ctx.fillStyle = '#111111';
  ctx.textAlign = 'center';
  ctx.font =
    'bold 72px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
  const name =
    venueName.length > 24 ? `${venueName.slice(0, 23)}…` : venueName;
  ctx.fillText(name, CARD_W / 2, 190);

  // Sub-caption
  ctx.font =
    '42px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
  ctx.fillStyle = '#555555';
  ctx.fillText('Scan for our menu', CARD_W / 2, 265);

  // QR
  const qrImage = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = qrDataUrl;
  });
  ctx.drawImage(qrImage, (CARD_W - QR_SIZE) / 2, 330, QR_SIZE, QR_SIZE);

  // URL
  ctx.font =
    '36px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  ctx.fillStyle = '#555555';
  const displayUrl = url.replace(/^https?:\/\//, '');
  ctx.fillText(
    displayUrl.length > 44 ? `${displayUrl.slice(0, 43)}…` : displayUrl,
    CARD_W / 2,
    330 + QR_SIZE + 90,
  );

  // Kuza mark
  ctx.font =
    '32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
  ctx.fillStyle = '#999999';
  ctx.fillText('Powered by Kuza', CARD_W / 2, CARD_H - 110);

  return canvas.toDataURL('image/png');
}

/** SVG table-tent card (scales losslessly for print shops). */
export async function generateQrCardSvg(
  url: string,
  venueName: string,
): Promise<string> {
  const qrSvg = await QRCode.toString(url, {
    type: 'svg',
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#111111', light: '#FFFFFF' },
  });

  // Strip the XML prolog and outer size so we can embed and scale it.
  const inner = qrSvg
    .replace(/<\?xml[^>]*\?>/, '')
    .replace(/<svg([^>]*)>/, (match, attrs: string) => {
      const viewBox = /viewBox="([^"]+)"/.exec(attrs)?.[1] || '0 0 100 100';
      return `<svg viewBox="${viewBox}" x="${(CARD_W - QR_SIZE) / 2}" y="330" width="${QR_SIZE}" height="${QR_SIZE}">`;
    });

  const name = escapeXml(
    venueName.length > 24 ? `${venueName.slice(0, 23)}…` : venueName,
  );
  const displayUrl = escapeXml(url.replace(/^https?:\/\//, ''));
  const sans =
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif";

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_W}" height="${CARD_H}" viewBox="0 0 ${CARD_W} ${CARD_H}">`,
    `<rect width="${CARD_W}" height="${CARD_H}" fill="#FFFFFF"/>`,
    `<rect x="40" y="40" width="${CARD_W - 80}" height="${CARD_H - 80}" fill="none" stroke="#111111" stroke-width="6"/>`,
    `<text x="${CARD_W / 2}" y="190" text-anchor="middle" font-family="${sans}" font-size="72" font-weight="bold" fill="#111111">${name}</text>`,
    `<text x="${CARD_W / 2}" y="265" text-anchor="middle" font-family="${sans}" font-size="42" fill="#555555">Scan for our menu</text>`,
    inner,
    `<text x="${CARD_W / 2}" y="${330 + QR_SIZE + 90}" text-anchor="middle" font-family="monospace" font-size="36" fill="#555555">${displayUrl}</text>`,
    `<text x="${CARD_W / 2}" y="${CARD_H - 110}" text-anchor="middle" font-family="${sans}" font-size="32" fill="#999999">Powered by Kuza</text>`,
    `</svg>`,
  ].join('');
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function downloadSvg(svgMarkup: string, filename: string): void {
  const blob = new Blob([svgMarkup], { type: 'image/svg+xml' });
  const objectUrl = URL.createObjectURL(blob);
  downloadDataUrl(objectUrl, filename);
  URL.revokeObjectURL(objectUrl);
}
