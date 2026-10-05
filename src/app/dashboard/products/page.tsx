import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectToDatabase from "@/lib/mongoose";
import Product from "@/models/Product";
import "@/models/Category";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, Package, Edit, Trash2 } from "lucide-react";
import Image from "next/image";
import { deleteProductAction, toggleProductPublishedAction } from "./actions";

export default async function ProductsListPage() {
  const session = await getServerSession(authOptions);
  await connectToDatabase();

  const shopId = session?.user.shopId;
  const products = await Product.find({ shopId }).sort({ createdAt: -1 }).populate('categoryId');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Products</h1>
          <p className="text-gray-500 mt-2">Manage your jewellery inventory and catalog.</p>
        </div>
        <Link href="/dashboard/products/create">
          <Button className="gap-2">
            <Plus className="w-4 h-4" /> Add Product
          </Button>
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="border-2 border-dashed rounded-lg p-12 text-center flex flex-col items-center justify-center">
          <Package className="w-12 h-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No products yet</h3>
          <p className="text-gray-500 mt-1 mb-4">Get started by adding your first jewellery piece to the catalog.</p>
          <Link href="/dashboard/products/create">
            <Button variant="outline">Add your first product</Button>
          </Link>
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
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
                      <form action={toggleProductPublishedAction.bind(null, product._id.toString())} className="inline-block">
                        <Button type="submit" variant="ghost" size="icon" title={product.isPublished ? "Unpublish" : "Publish"} className="h-8 w-8 text-gray-500 hover:text-blue-600">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </form>
                      <form action={deleteProductAction.bind(null, product._id.toString())} className="inline-block">
                        <Button type="submit" variant="ghost" size="icon" title="Delete product" className="h-8 w-8 text-gray-500 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
