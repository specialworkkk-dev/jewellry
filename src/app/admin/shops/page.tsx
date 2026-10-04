import connectToDatabase from "@/lib/mongoose";
import Shop from "@/models/Shop";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

export default async function AdminShopsPage() {
  await connectToDatabase();
  const shops = await Shop.find().sort({ createdAt: -1 }).lean();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">Manage Shops</h1>
      
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-600 font-medium border-b">
            <tr>
              <th className="px-6 py-4">Shop Name</th>
              <th className="px-6 py-4">Slug</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {shops.map((shop) => (
              <tr key={shop._id.toString()} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{shop.name}</td>
                <td className="px-6 py-4 text-gray-500">{shop.slug}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${shop.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {shop.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right space-x-4">
                  <Link href={`/shop/${shop.slug}`} target="_blank" className="text-gray-500 hover:text-gray-700 inline-flex items-center gap-1">
                    Visit <ExternalLink className="w-3 h-3" />
                  </Link>
                  <Link href={`/admin/shops/${shop._id}`} className="text-amber-600 hover:text-amber-700 font-medium">
                    Configure
                  </Link>
                </td>
              </tr>
            ))}
            {shops.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                  No shops registered yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
