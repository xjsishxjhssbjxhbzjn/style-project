import { Router } from 'express';
import { FASHION_STYLES, getStyleById } from '../data/styles/index.js';
import { getStylePhotoUrls } from '../stylePhotos/resolvePhotos.js';

export const randomStyleRouter = Router();

function pickRandomStyleId(): string {
  const withPhotos = FASHION_STYLES.filter((s) => getStylePhotoUrls(s.id, 1).length > 0);
  const pool = withPhotos.length > 0 ? withPhotos : FASHION_STYLES;
  const index = Math.floor(Math.random() * pool.length);
  return pool[index]!.id;
}

randomStyleRouter.get('/', (_req, res) => {
  const style = getStyleById(pickRandomStyleId());
  if (!style) {
    res.status(500).json({ error: 'NO_STYLES' });
    return;
  }

  res.json({
    id: style.id,
    name: style.name,
    aesthetics: style.aesthetics,
    visualImpression: style.visualImpression,
    colorPalette: style.colorPalette,
    silhouettes: style.silhouettes,
    garmentElements: style.garmentElements,
    accessories: style.accessories,
    footwear: style.footwear,
    materials: style.materials,
    photos: getStylePhotoUrls(style.id, 4),
  });
});
