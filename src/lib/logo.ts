const MAX_WIDTH = 480;
const MAX_HEIGHT = 160;
/** Limite côté serveur : 200 000 caractères pour l'image encodée */
const MAX_LENGTH = 190_000;
const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp'];

export class LogoError extends Error {}

function load(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new LogoError('Image illisible.'));
    };
    img.src = url;
  });
}

/** Réduit l'image à 480 × 160 px au plus (transparence conservée) et la renvoie en data URL PNG, ou WebP si elle reste lourde. */
export async function imageToLogoDataUrl(file: File): Promise<string> {
  if (!ACCEPTED.includes(file.type)) throw new LogoError('Format accepté : PNG, JPEG ou WebP.');
  const img = await load(file);
  const scale = Math.min(1, MAX_WIDTH / img.naturalWidth, MAX_HEIGHT / img.naturalHeight);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new LogoError('Image illisible.');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  for (const [type, quality] of [['image/png', undefined], ['image/webp', 0.85], ['image/webp', 0.6]] as const) {
    const data = canvas.toDataURL(type, quality);
    if (data.startsWith(`data:${type}`) && data.length <= MAX_LENGTH) return data;
  }
  throw new LogoError('Logo trop lourd : utilisez une image plus simple.');
}
