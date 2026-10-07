import connectToDatabase from "@/lib/mongoose";
import User from "@/models/User";
import { requirePlatformAdmin } from "@/lib/admin-auth";
import { parseListParams } from "@/components/admin/list-params";
import { AdminSearchForm, AdminPagination } from "@/components/admin/AdminListControls";

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
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">Manage Users</h1>
      <AdminSearchForm q={q} placeholder="Search name, email or username" />
      
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 font-medium border-b">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4 text-right">Registered</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((user) => (
                <tr key={user._id.toString()} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{user.name}</td>
                  <td className="px-6 py-4 text-gray-500">{user.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                      {String(user.role).replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-gray-500">
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
