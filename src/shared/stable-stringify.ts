/**
 * JSON.stringify with sorted object keys, so logically-equal objects produce
 * identical signatures regardless of key insertion order (imported/saved
 * payloads arrive in an order we don't control; plain JSON.stringify would
 * silently turn them into permanent cache misses). Signatures are in-memory
 * only — cache keys and history dedupe — never persisted.
 */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value))
    return '[' + value.map(stableStringify).join(',') + ']';
  const record = value as Record<string, unknown>;
  return (
    '{' +
    Object.keys(record)
      .sort()
      .map((key) => JSON.stringify(key) + ':' + stableStringify(record[key]))
      .join(',') +
    '}'
  );
}
