import connectToDatabase from "@/lib/mongoose";
import Shop from "@/models/Shop";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { requirePlatformAdmin } from "@/lib/admin-auth";
import { parseListParams } from "@/components/admin/list-params";
import { AdminSearchForm, AdminPagination } from "@/components/admin/AdminListControls";

export default async function AdminShopsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePlatformAdmin();
  const { q, page, size, regex, skip } = parseListParams(await searchParams);
  await connectToDatabase();
  const filter = regex ? { $or: [{ name: regex }, { slug: regex }, { city: regex }] } : {};
  const [shops, total] = await Promise.all([
    Shop.find(filter)
      .select("name slug isActive planPrice planEndsAt createdAt")
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(size)
      .lean(),
    Shop.countDocuments(filter),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">Manage Shops</h1>
      <AdminSearchForm q={q} placeholder="Search name, slug or city" />
      
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 font-medium border-b">
              <tr>
                <th className="px-6 py-4">Shop Name</th>
                <th className="px-6 py-4">Slug</th>
                <th className="px-6 py-4">Plan</th>
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
                    {(shop.planPrice ?? 0) > 0 ? (
                      <div>
                        <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">Premium · ₹{Number(shop.planPrice).toLocaleString("en-IN")}</span>
                        {shop.planEndsAt && <p className="mt-1.5 text-xs text-gray-500">Ends {new Date(shop.planEndsAt).toLocaleDateString("en-IN")}</p>}
                      </div>
                    ) : (
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600">Free</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${shop.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {shop.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-4">
                    <Link href={`/shop/${shop.slug}`} target="_blank" className="text-gray-500 hover:text-gray-700 inline-flex items-center gap-1">
                      Visit <ExternalLink className="w-3 h-3" />
                    </Link>
                    <Link prefetch={true} href={`/admin/shops/${shop._id}`} className="text-amber-600 hover:text-amber-700 font-medium">
                      Configure
                    </Link>
                  </td>
                </tr>
              ))}
              {shops.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    {q ? "No shops match your search." : "No shops registered yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <AdminPagination q={q} page={page} size={size} total={total} />
    </div>
  );
}
