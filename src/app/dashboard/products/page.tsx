import connectToDatabase from "@/lib/mongoose";
import Product from "@/models/Product";
import "@/models/Category";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, Package, Edit } from "lucide-react";
import Image from "next/image";
import { deleteProductAction, setProductPublishedAction } from "./actions";
import { ConfirmDeleteProductButton } from "@/components/shop/ConfirmDeleteProductButton";
import { ActionSubmitButton } from "@/components/ui/action-submit-button";
import { requireOwnerTenant } from "@/lib/tenant";
import { OwnerPagination } from "@/components/ui/owner-pagination";
import { clampOwnerPage, getOwnerPagination, type OwnerListSearchParams } from "@/lib/owner-pagination";

export default async function ProductsListPage({ searchParams }: { searchParams: OwnerListSearchParams }) {
  const { shopId } = await requireOwnerTenant();
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
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Products</h1>
          <p className="text-gray-500 mt-2">Manage your jewellery inventory and catalog.</p>
        </div>
        <Link prefetch={true} href="/dashboard/products/create" className="w-full sm:w-auto">
          <Button className="w-full gap-2 sm:w-auto min-h-11">
            <Plus className="w-4 h-4" /> Add Product
          </Button>
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="border-2 border-dashed rounded-lg p-12 text-center flex flex-col items-center justify-center">
          <Package className="w-12 h-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No products yet</h3>
          <p className="text-gray-500 mt-1 mb-4">Get started by adding your first jewellery piece to the catalog.</p>
          <Link prefetch={true} href="/dashboard/products/create">
            <Button variant="outline">Add your first product</Button>
          </Link>
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
          <div className="divide-y sm:hidden">
            {products.map((product) => (
              <article key={product._id.toString()} className="p-4">
                <div className="flex gap-3">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border bg-gray-100">
                    {product.images?.[0] ? (
                      <Image src={product.images[0]} alt={product.name} width={80} height={80} unoptimized className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-gray-400">No image</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="line-clamp-2 font-semibold text-gray-900">{product.name}</h2>
                      <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] ${product.isPublished ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                        {product.isPublished ? "Live" : "Draft"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">SKU: {product.sku}</p>
                    <p className="mt-2 text-sm font-medium text-gray-800">
                      {product.priceType === "FIXED_PRICE" ? `₹${product.price?.toLocaleString("en-IN")}` : product.priceType.replace(/_/g, " ")}
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <form action={setProductPublishedAction.bind(null, product._id.toString(), !product.isPublished)}>
                    <ActionSubmitButton pendingLabel={product.isPublished ? "Saving Draft…" : "Publishing…"} variant="outline" className="w-full min-h-11">
                      <Edit className="mr-2 h-4 w-4" /> {product.isPublished ? "Make Draft" : "Publish"}
                    </ActionSubmitButton>
                  </form>
                  <form action={deleteProductAction.bind(null, product._id.toString())}>
                    <ConfirmDeleteProductButton />
                  </form>
                </div>
              </article>
            ))}
          </div>
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[680px] text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 font-medium border-b">
                <tr>
                  <th className="px-6 py-4">Product</th>
                  <th className="px-6 py-4">SKU</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Price / Type</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {products.map((product) => (
                  <tr key={product._id.toString()} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-md bg-gray-100 flex-shrink-0 overflow-hidden border">
                        {product.images?.[0] && (
                          <Image src={product.images[0]} alt={product.name} width={48} height={48} unoptimized className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="font-medium text-gray-900">{product.name}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{product.sku}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-xs rounded-full ${product.isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                        {product.isPublished ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {product.priceType === 'FIXED_PRICE' ? `₹${product.price}` : product.priceType.replace(/_/g, ' ')}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <form action={setProductPublishedAction.bind(null, product._id.toString(), !product.isPublished)} className="inline-block">
                        <ActionSubmitButton pendingLabel="" variant="ghost" size="icon" title={product.isPublished ? "Unpublish" : "Publish"} className="h-8 w-8 text-gray-500 hover:text-blue-600">
                          <Edit className="w-4 h-4" />
                        </ActionSubmitButton>
                      </form>
                      <form action={deleteProductAction.bind(null, product._id.toString())} className="inline-block">
                        <ConfirmDeleteProductButton compact />
                      </form>
                    </td>
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
