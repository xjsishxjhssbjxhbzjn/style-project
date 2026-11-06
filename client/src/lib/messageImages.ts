const IMG_SUFFIX = /<!--IMG(\[[\s\S]*?\])-->$/;

export function attachImagesToContent(content: string, images?: string[]): string {
  if (!images?.length) return content;
  return `${content}\n<!--IMG${JSON.stringify(images)}-->`;
}

export function parseStoredMessage(stored: string): { content: string; images?: string[] } {
  const match = stored.match(IMG_SUFFIX);
  if (!match) return { content: stored };
  try {
    const images = JSON.parse(match[1]) as string[];
    const content = stored.replace(IMG_SUFFIX, '').trimEnd();
    return { content, images: Array.isArray(images) ? images : undefined };
  } catch {
    return { content: stored };
  }
}
