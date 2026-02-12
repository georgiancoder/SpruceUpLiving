export function estimateReadingMinutesFromText(input: unknown, wpm = 200): number | null {
  const text = typeof input === 'string' ? input : '';
  const normalized = text
    .replace(/<[^>]+>/g, ' ') // strip HTML
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) return null;

  const words = normalized.split(' ').filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / wpm));
  return Number.isFinite(minutes) ? minutes : null;
}

export function estimateReadingMinutesFromPost(post: unknown, wpm = 200): number | null {
  const p: any = post;

  // Try common fields; adjust to your post schema if needed
  const candidates = [
    p?.content,
    p?.body,
    p?.html,
    p?.markdown,
    p?.excerpt,
    p?.description,
  ];

  const combined = candidates
    .filter((x: any) => typeof x === 'string' && x.trim().length)
    .join('\n\n');

  return estimateReadingMinutesFromText(combined, wpm);
}
