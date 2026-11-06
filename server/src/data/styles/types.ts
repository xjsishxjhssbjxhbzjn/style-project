export type FashionStyle = {
  id: string;
  name: string;
  aesthetics: string;
  colorPalette: string[];
  silhouettes: string[];
  garmentElements: string[];
  accessories: string[];
  footwear: string[];
  materials: string[];
  visualImpression: string;
  distinguishesFrom: { id: string; note: string }[];
  scoringSignals: {
    boosts: string[];
    penalties: string[];
  };
};
