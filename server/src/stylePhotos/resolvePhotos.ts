import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { STYLE_ID_TO_PHOTO_FOLDER } from './mapping.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PHOTO_ROOT = path.resolve(__dirname, '../../../stylephoto');

const IMAGE_EXT = /\.(jpe?g|jfif|png|webp|gif)$/i;

export function getStylePhotoUrls(styleId: string, limit = 2): string[] {
  const folder = STYLE_ID_TO_PHOTO_FOLDER[styleId];
  if (!folder) return [];

  const dir = path.join(PHOTO_ROOT, folder);
  if (!fs.existsSync(dir)) return [];

  const files = fs
    .readdirSync(dir)
    .filter((f) => IMAGE_EXT.test(f))
    .sort((a, b) => a.localeCompare(b, 'ru'))
    .slice(0, limit);

  return files.map(
    (file) =>
      `/stylephoto/${encodeURIComponent(folder)}/${encodeURIComponent(file)}`
  );
}
