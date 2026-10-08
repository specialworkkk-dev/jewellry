import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { OWNER_PAGE_SIZES, getOwnerPageCount } from "@/lib/owner-pagination";

type OwnerPaginationProps = {
  basePath: string;
  page: number;
  perPage: number;
  totalItems: number;
};

function pageHref(basePath: string, page: number, perPage: number) {
  return `${basePath}?page=${page}&perPage=${perPage}`;
}

export function OwnerPagination({ basePath, page, perPage, totalItems }: OwnerPaginationProps) {
  if (totalItems <= OWNER_PAGE_SIZES[0]) return null;

  const totalPages = getOwnerPageCount(totalItems, perPage);
  const firstItem = (page - 1) * perPage + 1;
  const lastItem = Math.min(page * perPage, totalItems);

  return (
    <nav aria-label="List pagination" className="border-t border-gray-100 bg-gray-50/70 px-4 py-4 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="shrink-0 whitespace-nowrap text-xs font-medium text-gray-600 sm:text-sm">
          Showing {firstItem}–{lastItem} of {totalItems}
        </p>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <span className="text-xs text-gray-500">Per page</span>
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
            {OWNER_PAGE_SIZES.map((size) => (
              <Link
                key={size}
                href={pageHref(basePath, 1, size)}
                aria-current={size === perPage ? "page" : undefined}
                className={`inline-flex min-h-10 min-w-10 items-center justify-center rounded-md px-2 text-center text-sm font-semibold transition ${
                  size === perPage
                    ? "bg-gray-900 text-white"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                {size}
              </Link>
            ))}
          </div>

          <div className="inline-flex items-center gap-1 sm:ml-2">
            {page > 1 ? (
              <Link
                href={pageHref(basePath, page - 1, perPage)}
                aria-label="Previous page"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-100"
              >
                <ChevronLeft className="h-4 w-4" />
              </Link>
            ) : (
              <span aria-hidden="true" className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-100 bg-gray-100 text-gray-300">
                <ChevronLeft className="h-4 w-4" />
              </span>
            )}

            <span className="min-w-20 whitespace-nowrap px-1 text-center text-xs font-semibold text-gray-700">
              Page {page} of {totalPages}
            </span>

            {page < totalPages ? (
              <Link
                href={pageHref(basePath, page + 1, perPage)}
                aria-label="Next page"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-100"
              >
                <ChevronRight className="h-4 w-4" />
              </Link>
            ) : (
              <span aria-hidden="true" className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-100 bg-gray-100 text-gray-300">
                <ChevronRight className="h-4 w-4" />
              </span>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
