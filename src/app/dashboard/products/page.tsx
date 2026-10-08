import connectToDatabase from "@/lib/mongoose";
import Product from "@/models/Product";
import "@/models/Category";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, Package, Pencil, Eye, EyeOff } from "lucide-react";
import { isPlanExpired } from "@/components/shop/plan-state";
import Image from "next/image";
import { deleteProductAction, setProductPublishedAction } from "./actions";
import { ConfirmDeleteProductButton } from "@/components/shop/ConfirmDeleteProductButton";
import { ActionSubmitButton } from "@/components/ui/action-submit-button";
import { requireOwnerTenant } from "@/lib/tenant";
import { OwnerPagination } from "@/components/ui/owner-pagination";
import { clampOwnerPage, getOwnerPagination, type OwnerListSearchParams } from "@/lib/owner-pagination";

function formatOwnerPrice(priceType: string, price?: number) {
  if (price === undefined || price === null) return priceType.replace(/_/g, " ");
  if (priceType === "FIXED_PRICE") return `₹${price.toLocaleString("en-IN")}`;
  if (priceType === "STARTING_FROM") return `From ₹${price.toLocaleString("en-IN")}`;
  return priceType.replace(/_/g, " ");
}

export default async function ProductsListPage({ searchParams }: { searchParams: OwnerListSearchParams }) {
  const { shopId, shop } = await requireOwnerTenant();
  const planExpired = isPlanExpired(shop);
  await connectToDatabase();

  const { page: requestedPage, perPage } = await getOwnerPagination(searchParams);
  const loadProducts = (pageNumber: number) => Product.find({ shopId })
    .select("name sku images priceType price isPublished categoryId createdAt")
    .sort({ createdAt: -1 })
    .skip((pageNumber - 1) * perPage)
    .limit(perPage)
    .populate("categoryId", "name")
    .lean();
  const [totalProducts, requestedProducts] = await Promise.all([
    Product.countDocuments({ shopId }),
    loadProducts(requestedPage),
  ]);
  const page = clampOwnerPage(requestedPage, totalProducts, perPage);
  const products = page === requestedPage ? requestedProducts : await loadProducts(page);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold sm:text-3xl tracking-tight text-gray-900">Products</h1>
          <p className="text-gray-500 mt-2">Manage your jewellery inventory and catalog.</p>
        </div>
        {planExpired ? (
          <Button disabled title="Renew your plan to add products" className="w-full gap-2 sm:w-auto min-h-11">
            <Plus className="w-4 h-4" /> Add Product
          </Button>
        ) : (
          <Link prefetch={true} href="/dashboard/products/create" className="w-full sm:w-auto">
            <Button className="w-full gap-2 sm:w-auto min-h-11">
              <Plus className="w-4 h-4" /> Add Product
            </Button>
          </Link>
        )}
      </div>
      {planExpired && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Your plan has expired. Adding and editing products is disabled until you renew.
        </div>
      )}

      {products.length === 0 ? (
        <div className="border-2 border-dashed rounded-lg p-6 text-center sm:p-12 flex flex-col items-center justify-center">
          <Package className="w-12 h-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No products yet</h3>
          <p className="text-gray-500 mt-1 mb-4">Get started by adding your first jewellery piece to the catalog.</p>
          {planExpired ? (
            <Button variant="outline" disabled className="min-h-11">Add your first product</Button>
          ) : (
            <Link prefetch={true} href="/dashboard/products/create">
              <Button variant="outline" className="min-h-11">Add your first product</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
          <div className="divide-y lg:hidden">
            {products.map((product) => (
              <article key={product._id.toString()} className="min-w-0 p-3 min-[400px]:p-4">
                <div className="flex gap-3">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border bg-gray-100">
                    {product.images?.[0] ? (
                      <Image src={product.images[0]} alt={product.name} width={80} height={80} sizes="80px" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-gray-400">No image</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="line-clamp-2 min-w-0 break-words font-semibold text-gray-900">{product.name}</h2>
                      <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] ${product.isPublished ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                        {product.isPublished ? "Live" : "Draft"}
                      </span>
                    </div>
                    <p className="mt-1 break-all text-xs text-gray-500">SKU: {product.sku}</p>
                    <p className="mt-2 break-words text-sm font-medium text-gray-800">
                      {formatOwnerPrice(product.priceType, product.price)}
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {planExpired ? (
                    <Button variant="outline" disabled className="w-full min-h-11 gap-2 px-2"><Pencil className="h-4 w-4" /> Edit</Button>
                  ) : (
                    <Link href={`/dashboard/products/${product._id.toString()}/edit`} className="inline-flex min-h-11 w-full min-w-0 items-center justify-center gap-2 rounded-md border px-2 text-sm font-medium hover:bg-gray-50">
                      <Pencil className="h-4 w-4 shrink-0" /> Edit
                    </Link>
                  )}
                  <form action={setProductPublishedAction.bind(null, product._id.toString(), !product.isPublished)} className="min-w-0">
                    <ActionSubmitButton pendingLabel={product.isPublished ? "Saving…" : "Publishing…"} variant="outline" className="w-full min-h-11 gap-2 px-2">
                      {product.isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />} {product.isPublished ? "Make Draft" : "Publish"}
                    </ActionSubmitButton>
                  </form>
                  <form action={deleteProductAction.bind(null, product._id.toString())} className="col-span-2 min-w-0 sm:col-span-1">
                    <ConfirmDeleteProductButton />
                  </form>
                </div>
              </article>
            ))}
          </div>
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[680px] text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 font-medium border-b">
                <tr>
                  <th className="px-4 py-4 lg:px-6">Product</th>
                  <th className="px-4 py-4 lg:px-6">SKU</th>
                  <th className="px-4 py-4 lg:px-6">Status</th>
                  <th className="px-4 py-4 lg:px-6">Price / Type</th>
                  <th className="px-4 py-4 text-right lg:px-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {products.map((product) => (
                  <tr key={product._id.toString()} className="hover:bg-gray-50/50">
                    <td className="flex items-center gap-4 px-4 py-4 lg:px-6">
                      <div className="w-12 h-12 rounded-md bg-gray-100 flex-shrink-0 overflow-hidden border">
                        {product.images?.[0] && (
                          <Image src={product.images[0]} alt={product.name} width={48} height={48} sizes="48px" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="min-w-0 max-w-xs break-words font-medium text-gray-900">{product.name}</div>
                    </td>
                    <td className="max-w-[12rem] break-all px-4 py-4 text-gray-500 lg:px-6">{product.sku}</td>
                    <td className="px-4 py-4 lg:px-6">
                      <span className={`px-2.5 py-1 text-xs rounded-full ${product.isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                        {product.isPublished ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-gray-500 lg:px-6">
                      {formatOwnerPrice(product.priceType, product.price)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-right lg:px-6"><div className="flex items-center justify-end gap-1">
                      {planExpired ? (
                        <span className="inline-flex h-10 w-10 items-center justify-center text-gray-300" title="Renew your plan to edit"><Pencil className="w-4 h-4" /></span>
                      ) : (
                        <Link href={`/dashboard/products/${product._id.toString()}/edit`} title="Edit product" aria-label={`Edit ${product.name}`} className="inline-flex h-10 w-10 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-blue-600">
                          <Pencil className="w-4 h-4" />
                        </Link>
                      )}
                      <form action={setProductPublishedAction.bind(null, product._id.toString(), !product.isPublished)} className="inline-block">
                        <ActionSubmitButton pendingLabel="" variant="ghost" size="icon" title={product.isPublished ? "Unpublish" : "Publish"} className="h-10 w-10 text-gray-500 hover:text-blue-600">
                          {product.isPublished ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </ActionSubmitButton>
                      </form>
                      <form action={deleteProductAction.bind(null, product._id.toString())} className="inline-block">
                        <ConfirmDeleteProductButton compact />
                      </form>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <OwnerPagination basePath="/dashboard/products" page={page} perPage={perPage} totalItems={totalProducts} />
        </div>
      )}
    </div>
  );
}
