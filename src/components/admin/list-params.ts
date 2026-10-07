export const ADMIN_PAGE_SIZE_DEFAULT = 25;
export const ADMIN_PAGE_SIZE_MAX = 100;

type Raw = string | string[] | undefined;
const first = (v: Raw) => (Array.isArray(v) ? v[0] : v) ?? "";

export function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Parse and clamp ?q=, ?page= and ?size= from a searchParams object. */
export function parseListParams(sp: Record<string, Raw>) {
  const q = first(sp.q).trim().slice(0, 100);
  const page = Math.min(100_000, Math.max(1, Math.trunc(Number(first(sp.page))) || 1));
  const size = Math.min(ADMIN_PAGE_SIZE_MAX, Math.max(1, Math.trunc(Number(first(sp.size))) || ADMIN_PAGE_SIZE_DEFAULT));
  const regex = q ? new RegExp(escapeRegex(q), "i") : null;
  return { q, page, size, regex, skip: (page - 1) * size };
}
