export type { FashionStyle } from './types.js';
export { FASHION_STYLES } from './catalog.js';

import { FASHION_STYLES } from './catalog.js';

export function getStyleById(id: string) {
  return FASHION_STYLES.find((s) => s.id === id);
}

export function buildStylesCompactForPrompt(): string {
  return FASHION_STYLES.map((s) => {
    const dist = s.distinguishesFrom.map((d) => `${d.id}: ${d.note}`).join('; ');
    return `[${s.id}] ${s.name}
Эстетика: ${s.aesthetics}
Палитра: ${s.colorPalette.join(', ')}
Силуэты: ${s.silhouettes.join(', ')}
Ключевые элементы: ${s.garmentElements.slice(0, 6).join(', ')}
Отличия: ${dist}`;
  }).join('\n\n');
}
