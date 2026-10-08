import connectToDatabase from "@/lib/mongoose";
import User from "@/models/User";
import { requirePlatformAdmin } from "@/lib/admin-auth";
import { parseListParams } from "@/components/admin/list-params";
import { AdminSearchForm, AdminPagination } from "@/components/admin/AdminListControls";

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`inline-block shrink-0 whitespace-nowrap rounded-full px-2 py-1 text-xs font-medium ${role === "SUPER_ADMIN" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
      {String(role).replace("_", " ")}
    </span>
  );
}

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePlatformAdmin();
  const { q, page, size, regex, skip } = parseListParams(await searchParams);
  await connectToDatabase();
  const filter = regex ? { $or: [{ name: regex }, { email: regex }, { username: regex }] } : {};
  const [users, total] = await Promise.all([
    User.find(filter)
      .select("name email role createdAt")
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(size)
      .lean(),
    User.countDocuments(filter),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold sm:text-3xl tracking-tight text-gray-900">Manage Users</h1>
      <AdminSearchForm q={q} placeholder="Search name, email or username" />
      
      {/* Phones: one card per user */}
      <ul className="grid gap-3 md:grid-cols-2 lg:hidden">
        {users.map((user) => (
          <li key={user._id.toString()} className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 break-words font-semibold text-gray-900">{user.name}</p>
              <RoleBadge role={user.role} />
            </div>
            {user.email && <p className="mt-1 break-all text-sm text-gray-500">{user.email}</p>}
            <p className="mt-2 text-xs text-gray-400">Registered {new Date(user.createdAt).toLocaleDateString()}</p>
          </li>
        ))}
        {users.length === 0 && (
          <li className="rounded-lg border bg-white px-4 py-8 text-center text-gray-500 md:col-span-2">{q ? "No users match your search." : "No users yet."}</li>
        )}
      </ul>

      <div className="hidden overflow-hidden rounded-lg border bg-white shadow-sm lg:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 font-medium border-b">
              <tr>
                <th className="px-4 py-4 lg:px-6">Name</th>
                <th className="px-4 py-4 lg:px-6">Email</th>
                <th className="px-4 py-4 lg:px-6">Role</th>
                <th className="px-4 py-4 text-right lg:px-6">Registered</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((user) => (
                <tr key={user._id.toString()} className="hover:bg-gray-50">
                  <td className="max-w-[14rem] break-words px-4 py-4 font-medium text-gray-900 lg:px-6">{user.name}</td>
                  <td className="max-w-[16rem] break-all px-4 py-4 text-gray-500 lg:px-6">{user.email}</td>
                  <td className="px-4 py-4 lg:px-6"><RoleBadge role={user.role} /></td>
                  <td className="whitespace-nowrap px-4 py-4 text-right text-gray-500 lg:px-6">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">{q ? "No users match your search." : "No users yet."}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <AdminPagination q={q} page={page} size={size} total={total} />
    </div>
  );
}
