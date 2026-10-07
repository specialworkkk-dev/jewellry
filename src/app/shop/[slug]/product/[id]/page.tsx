import { notFound } from "next/navigation";
import { ArrowLeft, MessageCircle, Phone, ShieldCheck, MapPin } from "lucide-react";
import Link from "next/link";
import { Metadata, ResolvingMetadata } from "next";
import { ProductActionButtons } from "@/components/public/ProductActionButtons";
import { EnquiryForm } from "@/components/public/EnquiryForm";
import { StorefrontAnalytics } from "@/components/public/StorefrontAnalytics";
import { getPublicProductById, getPublicShopBySlug } from "@/lib/public-store";
import { ProductGallery } from "@/components/public/ProductGallery";
import Interaction from "@/models/Interaction";
import { resolveStorefrontTemplate } from "@/lib/storefront-template";
import { STOREFRONT_THEMES } from "@/components/storefront/themes";
import { makingChargeText, priceText, savingsText } from "@/components/storefront/shared";
import { getPublicActorId } from "@/lib/public-actor";
import connectToDatabase from "@/lib/mongoose";

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string; id: string }> },
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug, id } = await params;
  const shop = await getPublicShopBySlug(slug);
  if (!shop || shop.isActive === false) return { title: "Not Found" };

  try {
    const product = await getPublicProductById(shop._id.toString(), id);
    if (!product) return { title: "Not Found" };

    const previousImages = (await parent).openGraph?.images || [];
    const images = product.images?.[0] ? [product.images[0], ...previousImages] : previousImages;

    return {
      title: `${product.name} | ${shop.name}`,
      description: product.description || `Buy ${product.name} at ${shop.name}`,
      openGraph: {
        title: product.name,
        description: product.description || `Premium Jewellery at ${shop.name}`,
        url: `/shop/${shop.slug}/product/${product._id}`,
        siteName: shop.name,
        images,
        locale: 'en_IN',
        type: 'website',
      },
    };
  } catch {
    return { title: "Not Found" };
  }
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const shop = await getPublicShopBySlug(slug);
  if (!shop || shop.isActive === false) notFound();

  let product;
  try {
    product = await getPublicProductById(shop._id.toString(), id);
    if (!product) notFound();
  } catch {
    notFound(); // Handle invalid ObjectId
  }

  const normalizedPhone = (shop.whatsappNumber || "").replace(/\D/g, "");
  const normalizedCallNumber = (shop.businessPhone || shop.whatsappNumber || "").replace(/[^\d+]/g, "");
  const waMessage = encodeURIComponent(`Hi! I'm interested in this product: ${product.name} (SKU: ${product.sku}). Could you provide more details?`);
  const waUrl = normalizedPhone ? `https://wa.me/${normalizedPhone}?text=${waMessage}` : "#";
  const actorId = await getPublicActorId();
  if (actorId) await connectToDatabase();
  const initiallyLiked = actorId
    ? Boolean(await Interaction.exists({
      userId: actorId,
      shopId: shop._id,
      targetId: product._id,
      targetType: "PRODUCT",
      interactionType: "LIKE",
    }))
    : false;
  const theme = STOREFRONT_THEMES[resolveStorefrontTemplate(shop)];
  const d = theme.detail;
  const priceLabel = priceText(product);
  const savings = savingsText(product);
  const makingCharge = makingChargeText(product);

  const specRow = "flex justify-between gap-4 border-b pb-2 " + d.rule;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 pt-4 sm:px-6 sm:pb-24 sm:pt-10 lg:px-8">
      <StorefrontAnalytics shopId={shop._id.toString()} eventType="PRODUCT_VIEW" targetId={product._id.toString()} />

      {/* Breadcrumb / Back button */}
      <div className="mb-4 sm:mb-8">
        <Link href={`/shop/${shop.slug}`} className={`inline-flex items-center text-sm font-medium transition-colors hover:opacity-70 ${d.subtle}`}>
          <ArrowLeft className="w-4 h-4 mr-2 shrink-0" /> Back to {shop.name}
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-7 lg:gap-16">

        {/* Left: Image Gallery */}
        <ProductGallery images={product.images || []} videos={product.videos || []} productName={product.name} />

        {/* Right: Product Details */}
        <div className="flex min-w-0 flex-col pt-2">
          <div className="flex items-center justify-between gap-3">
            <p className={`text-sm font-medium tracking-widest uppercase ${d.accent}`}>{product.goldPurity || 'Premium'} Jewellery</p>
            <ProductActionButtons
              productName={product.name}
              productId={product._id.toString()}
              shopId={shop._id.toString()}
              initialLiked={initiallyLiked}
              initialLikesCount={product.likesCount || 0}
            />
          </div>

          <h1 style={{ fontFamily: theme.display }} className={`mt-2 break-words text-3xl sm:text-4xl ${d.heading}`}>{product.name}</h1>
          <p className={`mt-2 break-all font-mono text-sm ${d.subtle}`}>SKU: {product.sku}</p>

          <div className={`mt-6 border-b pb-6 ${d.rule}`}>
            <p className={`text-2xl font-medium ${d.heading}`}>
              {priceLabel}
            </p>
            {savings && (
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                <span className={`line-through opacity-70 ${d.subtle}`}>{savings.original}</span>
                <span className={`rounded-full px-2 py-1 font-semibold ${d.badge}`}>{savings.label}</span>
              </p>
            )}
            <p className={`mt-1 text-sm ${d.subtle}`}>Inclusive of all taxes. Gold rates subject to daily change.</p>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-3 sm:gap-4 mt-6 sm:mt-8">
            {normalizedPhone && (
              <a href={waUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 bg-[#0f7a3d] hover:bg-[#0b6633] text-white px-3 py-4 rounded-lg font-medium transition-colors shadow-sm min-h-14">
                <MessageCircle className="w-5 h-5" /> WhatsApp
              </a>
            )}
            {normalizedCallNumber && (
              <a href={`tel:${normalizedCallNumber}`} className={`flex items-center justify-center gap-2 px-3 py-4 rounded-lg font-medium transition-colors shadow-sm min-h-14 ${d.primaryButton}`}>
                <Phone className="w-5 h-5" /> Call Store
              </a>
            )}
          </div>

          {/* Details Grid */}
          <div className="mt-12">
            <h2 style={{ fontFamily: theme.display }} className={`mb-4 border-b pb-2 text-lg font-medium ${d.heading} ${d.rule}`}>Product Specifications</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
              {product.goldPurity && (
                <div className={specRow}>
                  <dt className={d.subtle}>Gold Purity</dt>
                  <dd className={`font-medium ${d.heading}`}>{product.goldPurity}</dd>
                </div>
              )}
              {product.goldWeight && (
                <div className={specRow}>
                  <dt className={d.subtle}>Gross Weight</dt>
                  <dd className={`font-medium ${d.heading}`}>{product.goldWeight} g</dd>
                </div>
              )}
              {product.diamondWeight && (
                <div className={specRow}>
                  <dt className={d.subtle}>Diamond Weight</dt>
                  <dd className={`font-medium ${d.heading}`}>{product.diamondWeight} ct</dd>
                </div>
              )}
              {product.stoneType && (
                <div className={specRow}>
                  <dt className={d.subtle}>Stone Type</dt>
                  <dd className={`font-medium ${d.heading}`}>{product.stoneType}</dd>
                </div>
              )}
              {product.makingCharges != null && (
                <div className={specRow}>
                  <dt className={d.subtle}>Making Charges</dt>
                  <dd className={`text-right font-medium ${d.heading}`}>
                    {makingCharge ? (
                      <>
                        <span className={`mr-2 line-through opacity-70 ${d.subtle}`}>{makingCharge.original}</span>
                        <span>{makingCharge.discounted}</span>
                        <span className={`mt-0.5 block text-xs font-semibold ${d.accent}`}>{makingCharge.label}</span>
                      </>
                    ) : `₹${product.makingCharges.toLocaleString("en-IN")}`}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Description */}
          {product.description && (
            <div className={`mt-8 text-sm ${d.body}`}>
              <h2 style={{ fontFamily: theme.display }} className={`mb-2 text-lg font-medium ${d.heading}`}>Description</h2>
              <p className="whitespace-pre-line break-words">{product.description}</p>
            </div>
          )}

          {/* Trust Badges */}
          <div className={`mt-10 flex flex-col gap-6 rounded-lg p-6 sm:flex-row ${d.panel}`}>
            <div className="flex items-center gap-3">
              <ShieldCheck className={`w-8 h-8 flex-shrink-0 ${d.accent}`} />
              <div>
                <p className={`text-sm font-medium ${d.heading}`}>Certified Jewellery</p>
                <p className={`text-xs ${d.subtle}`}>100% Authentic & Hallmarked</p>
              </div>
            </div>
            {(shop.city || shop.state) && (
              <div className="flex items-center gap-3">
                <MapPin className={`w-8 h-8 flex-shrink-0 ${d.accent}`} />
                <div>
                  <p className={`text-sm font-medium ${d.heading}`}>Visit Store</p>
                  <p className={`text-xs ${d.subtle}`}>{[shop.city, shop.state].filter(Boolean).join(", ")}</p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-10">
            <EnquiryForm shopId={shop._id.toString()} productId={product._id.toString()} />
          </div>

        </div>
      </div>
    </div>
  );
}
