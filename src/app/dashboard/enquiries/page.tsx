import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectToDatabase from "@/lib/mongoose";
import Enquiry from "@/models/Enquiry";
import { Button } from "@/components/ui/button";
import { CheckCircle, MessageSquare, Phone } from "lucide-react";
import { markEnquiryContactedAction } from "./actions";
import "@/models/Product";

export default async function EnquiriesDashboardPage() {
  const session = await getServerSession(authOptions);
  await connectToDatabase();

  const shopId = session?.user.shopId;
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
          <>
          <div className="divide-y sm:hidden">
            {enquiries.map((enquiry) => {
              const whatsappPhone = enquiry.customerPhone.replace(/\D/g, "");
              return (
                <article key={enquiry._id.toString()} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-semibold text-gray-900">{enquiry.customerName}</h2>
                      <a href={`tel:${enquiry.customerPhone.replace(/[^\d+]/g, "")}`} className="mt-1 flex items-center gap-1 text-sm text-blue-700">
                        <Phone className="h-3.5 w-3.5" /> {enquiry.customerPhone}
                      </a>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium
                      ${enquiry.status === "NEW" ? "bg-blue-100 text-blue-700" : ""}
                      ${enquiry.status === "CONTACTED" ? "bg-orange-100 text-orange-700" : ""}
                      ${enquiry.status === "CONVERTED" ? "bg-green-100 text-green-700" : ""}
                      ${enquiry.status === "CLOSED" ? "bg-gray-100 text-gray-700" : ""}
                    `}>{enquiry.status}</span>
                  </div>
                  <p className="rounded-lg bg-gray-50 p-3 text-sm leading-6 text-gray-700">{enquiry.message}</p>
                  {enquiry.productId && (
                    <p className="text-xs font-medium text-amber-700">
                      Product: {typeof enquiry.productId === "object" && "name" in enquiry.productId ? String(enquiry.productId.name) : "Product"}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">Received {new Date(enquiry.createdAt).toLocaleDateString("en-IN")}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {enquiry.status === "NEW" ? (
                      <form action={markEnquiryContactedAction.bind(null, enquiry._id.toString())}>
                        <Button type="submit" variant="outline" className="w-full min-h-11 border-green-200 text-green-700 hover:bg-green-50">
                          <CheckCircle className="mr-1.5 h-4 w-4" /> Contacted
                        </Button>
                      </form>
                    ) : <div />}
                    <a href={`https://wa.me/${whatsappPhone}`} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center rounded-md border border-green-200 bg-green-50 px-3 text-sm font-medium text-green-700">
                      Reply on WhatsApp
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[760px] text-sm text-left">
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
                          Ref: {typeof enquiry.productId === "object" && "name" in enquiry.productId ? String(enquiry.productId.name) : "Product"}
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
                        <form action={markEnquiryContactedAction.bind(null, enquiry._id.toString())} className="inline-block">
                          <Button type="submit" variant="outline" size="sm" className="h-8 border-green-200 text-green-700 hover:bg-green-50">
                            <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Contacted
                          </Button>
                        </form>
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
          </div>
          </>
        )}
      </div>
    </div>
  );
}
