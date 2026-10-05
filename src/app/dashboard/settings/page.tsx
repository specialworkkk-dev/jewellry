import { ShopSettingsForm } from "@/components/shop/ShopSettingsForm";
import { getCurrentSession } from "@/lib/session";
import { getOwnerShop } from "@/lib/owner-data";

export default async function ShopSettingsPage() {
  const session = await getCurrentSession();
  const shop = session?.user.shopId ? await getOwnerShop(session.user.shopId) : null;
  const serializableShop = shop ? JSON.parse(JSON.stringify(shop)) : undefined;

  return <ShopSettingsForm shop={serializableShop} />;
}
