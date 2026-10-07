import { redirect } from "next/navigation";
import { requireOwnerTenant } from "@/lib/tenant";
import { isPlanExpired } from "@/components/shop/plan-state";

export default async function CreateProductLayout({ children }: { children: React.ReactNode }) {
  const { shop } = await requireOwnerTenant();
  if (isPlanExpired(shop)) redirect("/dashboard/products");
  return children;
}
