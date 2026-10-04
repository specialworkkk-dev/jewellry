import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import connectToDatabase from "@/lib/mongoose";
import Shop from "@/models/Shop";
import { ShopSettingsForm } from "@/components/shop/ShopSettingsForm";

export default async function ShopSettingsPage() {
  const session = await getServerSession(authOptions);
  await connectToDatabase();

  const shop = await Shop.findById((session?.user as any).shopId).lean();

  return <ShopSettingsForm shop={shop} />;
}
