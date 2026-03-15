/** Base path for static assets (e.g. /dbd-hardcore when deployed to GitHub Pages subpath). Inlined at build time. */
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function killerImageSrc(killerId: string): string {
  return `${BASE}/killers/${encodeURIComponent(killerId)}.webp`;
}
