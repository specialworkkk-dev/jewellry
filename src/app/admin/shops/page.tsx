import connectToDatabase from "@/lib/mongoose";
import Shop from "@/models/Shop";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { requirePlatformAdmin } from "@/lib/admin-auth";
import { parseListParams } from "@/components/admin/list-params";
import { AdminSearchForm, AdminPagination } from "@/components/admin/AdminListControls";

function PlanBadge({ shop }: { shop: { planPrice?: number; planEndsAt?: Date | string } }) {
  if ((shop.planPrice ?? 0) > 0) {
    return (
      <div>
        <span className="inline-block rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">Premium · ₹{Number(shop.planPrice).toLocaleString("en-IN")}</span>
        {shop.planEndsAt && <p className="mt-1.5 text-xs text-gray-500">Ends {new Date(shop.planEndsAt).toLocaleDateString("en-IN")}</p>}
      </div>
    );
  }
  return <span className="inline-block rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600">Free</span>;
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
      {active ? "Active" : "Inactive"}
    </span>
  );
}

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
      <h1 className="text-2xl font-bold sm:text-3xl tracking-tight text-gray-900">Manage Shops</h1>
      <AdminSearchForm q={q} placeholder="Search name, slug or city" />
      
      {/* Phones: one card per shop */}
      <ul className="grid gap-3 md:grid-cols-2 lg:hidden">
        {shops.map((shop) => (
          <li key={shop._id.toString()} className="rounded-lg border bg-white p-4 shadow-sm">
            <p className="break-words font-semibold text-gray-900">{shop.name}</p>
            <p className="mt-0.5 break-all text-sm text-gray-500">/{shop.slug}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <PlanBadge shop={shop} />
              <StatusBadge active={shop.isActive} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link href={`/shop/${shop.slug}`} target="_blank" className="inline-flex min-h-11 items-center justify-center gap-1 rounded-md border text-sm text-gray-700 hover:bg-gray-50">
                Visit <ExternalLink className="w-3 h-3" />
              </Link>
              <Link prefetch={true} href={`/admin/shops/${shop._id}`} className="inline-flex min-h-11 items-center justify-center rounded-md bg-amber-600 text-sm font-medium text-white hover:bg-amber-700">
                Configure
              </Link>
            </div>
          </li>
        ))}
        {shops.length === 0 && (
          <li className="rounded-lg border bg-white px-4 py-8 text-center text-gray-500 md:col-span-2">{q ? "No shops match your search." : "No shops registered yet."}</li>
        )}
      </ul>

      {/* Desktop: table */}
      <div className="hidden overflow-hidden rounded-lg border bg-white shadow-sm lg:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 font-medium border-b">
              <tr>
                <th className="px-4 py-4 lg:px-6">Shop Name</th>
                <th className="px-4 py-4 lg:px-6">Slug</th>
                <th className="px-4 py-4 lg:px-6">Plan</th>
                <th className="px-4 py-4 lg:px-6">Status</th>
                <th className="px-4 py-4 text-right lg:px-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {shops.map((shop) => (
                <tr key={shop._id.toString()} className="hover:bg-gray-50">
                  <td className="max-w-[16rem] break-words px-4 py-4 font-medium text-gray-900 lg:px-6">{shop.name}</td>
                  <td className="max-w-[12rem] break-all px-4 py-4 text-gray-500 lg:px-6">{shop.slug}</td>
                  <td className="px-4 py-4 lg:px-6"><PlanBadge shop={shop} /></td>
                  <td className="px-4 py-4 lg:px-6"><StatusBadge active={shop.isActive} /></td>
                  <td className="px-4 py-4 text-right lg:px-6">
                    <div className="flex flex-wrap items-center justify-end gap-x-2">
                      <Link href={`/shop/${shop.slug}`} target="_blank" className="inline-flex min-h-10 items-center gap-1 px-2 text-gray-500 hover:text-gray-700">
                        Visit <ExternalLink className="w-3 h-3" />
                      </Link>
                      <Link prefetch={true} href={`/admin/shops/${shop._id}`} className="inline-flex min-h-10 items-center px-2 font-medium text-amber-600 hover:text-amber-700">
                        Configure
                      </Link>
                    </div>
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
