/** Rank supported HTTP encodings, respecting explicit q=0 exclusions. */
export function acceptedEncodings(header: string | undefined): Array<'br' | 'gzip'> {
  const weights = new Map<string, number>();
  for (const part of (header ?? '').toLowerCase().split(',')) {
    const [name, ...parameters] = part.trim().split(';');
    if (!name) continue;
    const quality = parameters.find(p => p.trim().startsWith('q='));
    const value = quality ? Number(quality.trim().slice(2)) : 1;
    weights.set(name, Number.isFinite(value) && value >= 0 && value <= 1 ? value : 0);
  }
  const quality = (encoding: string) => weights.get(encoding) ?? weights.get('*') ?? 0;
  return (['br', 'gzip'] as const).filter(e => quality(e) > 0).sort((a,b) => quality(b)-quality(a));
}
