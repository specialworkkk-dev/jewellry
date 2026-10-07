import { notFound } from "next/navigation";

import { StorefrontAnalytics } from "@/components/public/StorefrontAnalytics";
import { getPublicCatalogue, getPublicShopBySlug } from "@/lib/public-store";
import Interaction from "@/models/Interaction";
import { getPublicActorId } from "@/lib/public-actor";
import { StorefrontTemplate } from "@/components/storefront";
import { resolveStorefrontTemplate } from "@/lib/storefront-template";
import connectToDatabase from "@/lib/mongoose";

const normalizeWhatsAppNumber = (value?: string) => (value || "").replace(/\D/g, "");

export default async function PublicShopPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ category?: string; after?: string }>;
}) {
  const { slug } = await params;
  const { category: activeCategory, after } = await searchParams;
  const shop = await getPublicShopBySlug(slug);
  if (!shop || shop.isActive === false) notFound();

  const { categories, products, nextCursor } = await getPublicCatalogue(shop._id.toString(), activeCategory, after);
  const ownerWhatsApp = normalizeWhatsAppNumber(shop.whatsappNumber);
  const actorId = await getPublicActorId();
  const savedProductIds = new Set<string>();
  if (actorId && products.length > 0) {
    await connectToDatabase();
    const ids = await Interaction.find({
      userId: actorId,
      shopId: shop._id,
      targetId: { $in: products.map((product) => product._id) },
      targetType: "PRODUCT",
      interactionType: "LIKE",
    }).distinct("targetId");
    ids.forEach((id) => savedProductIds.add(id.toString()));
  }

  return (
    <>
      <StorefrontAnalytics shopId={shop._id.toString()} eventType="SHOP_VIEW" />
      <StorefrontTemplate
        template={resolveStorefrontTemplate(shop)}
        shop={shop}
        categories={categories}
        products={products}
        nextCursor={nextCursor}
        after={after}
        activeCategory={activeCategory}
        savedProductIds={[...savedProductIds]}
        ownerWhatsApp={ownerWhatsApp}
      />
    </>
  );
}
