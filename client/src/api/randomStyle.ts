export type RandomStyleResponse = {
  id: string;
  name: string;
  aesthetics: string;
  visualImpression: string;
  colorPalette: string[];
  silhouettes: string[];
  garmentElements: string[];
  accessories: string[];
  footwear: string[];
  materials: string[];
  photos: string[];
};

export async function fetchRandomStyle(): Promise<RandomStyleResponse> {
  const res = await fetch('/api/random-style');
  if (!res.ok) {
    throw new Error('Не удалось загрузить случайный стиль.');
  }
  return res.json() as Promise<RandomStyleResponse>;
}
