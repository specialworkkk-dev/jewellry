import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectToDatabase from "@/lib/mongoose";
import Enquiry from "@/models/Enquiry";
import Product from "@/models/Product"; // Required for populate()
import { Button } from "@/components/ui/button";
import { CheckCircle, MessageSquare, Phone, XCircle } from "lucide-react";

export default async function EnquiriesDashboardPage() {
  const session = await getServerSession(authOptions);
  await connectToDatabase();

  const shopId = (session?.user as any).shopId;
  const enquiries = await Enquiry.find({ shopId }).sort({ createdAt: -1 }).populate('productId', 'name sku').lean();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Enquiries & Leads</h1>
          <p className="text-gray-500 mt-2">Manage customer messages and product requests.</p>
        </div>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
        {enquiries.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <MessageSquare className="w-12 h-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No enquiries yet</h3>
            <p className="text-gray-500 mt-1">When customers ask about your products, they will appear here.</p>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 font-medium border-b">
              <tr>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Details</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {enquiries.map((enquiry) => (
                <tr key={enquiry._id.toString()} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{enquiry.customerName}</div>
                    <div className="text-gray-500 flex items-center gap-1 mt-1">
                      <Phone className="w-3 h-3" /> {enquiry.customerPhone}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="max-w-xs truncate text-gray-700">{enquiry.message}</div>
                    {enquiry.productId && (
                      <div className="text-xs text-amber-600 mt-1 font-medium">
                        Ref: {(enquiry.productId as any).name}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 text-xs rounded-full font-medium
                      ${enquiry.status === 'NEW' ? 'bg-blue-100 text-blue-700' : ''}
                      ${enquiry.status === 'CONTACTED' ? 'bg-orange-100 text-orange-700' : ''}
                      ${enquiry.status === 'CONVERTED' ? 'bg-green-100 text-green-700' : ''}
                      ${enquiry.status === 'CLOSED' ? 'bg-gray-100 text-gray-700' : ''}
                    `}>
                      {enquiry.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {new Date(enquiry.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    {enquiry.status === 'NEW' && (
                      <Button variant="outline" size="sm" className="h-8 border-green-200 text-green-700 hover:bg-green-50">
                        <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Contacted
                      </Button>
                    )}
                    <a href={`https://wa.me/${enquiry.customerPhone}`} target="_blank" rel="noreferrer">
                      <Button variant="outline" size="sm" className="h-8 bg-[#25D366]/10 border-[#25D366]/20 text-[#25D366] hover:bg-[#25D366]/20">
                         Reply on WA
                      </Button>
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
