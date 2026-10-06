export const OWNER_PAGE_SIZES = [5, 10, 15] as const;

export type OwnerListSearchParams = Promise<{
  page?: string | string[];
  perPage?: string | string[];
}>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function getOwnerPagination(searchParams: OwnerListSearchParams) {
  const query = await searchParams;
  const requestedPage = Number.parseInt(firstValue(query.page) || "1", 10);
  const requestedSize = Number.parseInt(firstValue(query.perPage) || "10", 10);

  return {
    page: Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1,
    perPage: OWNER_PAGE_SIZES.includes(requestedSize as (typeof OWNER_PAGE_SIZES)[number])
      ? requestedSize
      : 10,
  };
}

export function getOwnerPageCount(totalItems: number, perPage: number) {
  return Math.max(1, Math.ceil(totalItems / perPage));
}

export function clampOwnerPage(page: number, totalItems: number, perPage: number) {
  return Math.min(page, getOwnerPageCount(totalItems, perPage));
}
