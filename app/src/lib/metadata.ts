export function parseMetadata(
  metadata?: string | null,
): Record<string, unknown> | null {
  if (!metadata) return null;
  try {
    return JSON.parse(metadata);
  } catch {
    return null;
  }
}
