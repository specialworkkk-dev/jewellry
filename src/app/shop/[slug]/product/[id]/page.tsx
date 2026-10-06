import { notFound } from "next/navigation";
import { ArrowLeft, MessageCircle, Phone, ShieldCheck, MapPin } from "lucide-react";
import Link from "next/link";
import { Metadata, ResolvingMetadata } from "next";
import { ProductActionButtons } from "@/components/public/ProductActionButtons";
import { EnquiryForm } from "@/components/public/EnquiryForm";
import { StorefrontAnalytics } from "@/components/public/StorefrontAnalytics";
import { getPublicProductById, getPublicShopBySlug } from "@/lib/public-store";
import { ProductGallery } from "@/components/public/ProductGallery";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import Interaction from "@/models/Interaction";
import { isObjectId } from "@/lib/validation";

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
  const [session, cookieStore] = await Promise.all([getServerSession(authOptions), cookies()]);
  const cookieVisitorId = cookieStore.get("luxestore_visitor_id")?.value;
  const actorId = session?.user?.id || cookieVisitorId;
  const initiallyLiked = actorId && isObjectId(actorId)
    ? Boolean(await Interaction.exists({ userId: actorId, targetId: product._id, interactionType: "LIKE" }))
    : false;
  const priceLabel = product.priceType === "FIXED_PRICE" && product.price
    ? `₹${product.price.toLocaleString("en-IN")}`
    : product.priceType === "STARTING_FROM" && product.price
      ? `From ₹${product.price.toLocaleString("en-IN")}`
      : "Price on Request";

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-10 lg:px-8">
      <StorefrontAnalytics shopId={shop._id.toString()} eventType="PRODUCT_VIEW" targetId={product._id.toString()} />
      
      {/* Breadcrumb / Back button */}
      <div className="mb-4 sm:mb-8">
        <Link href={`/shop/${shop.slug}`} className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to {shop.name}
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-7 lg:gap-16">
        
        {/* Left: Image Gallery */}
        <ProductGallery images={product.images || []} videos={product.videos || []} productName={product.name} />

        {/* Right: Product Details */}
        <div className="flex flex-col pt-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium tracking-widest text-amber-600 uppercase">{product.goldPurity || 'Premium'} Jewellery</p>
            <ProductActionButtons
              productName={product.name}
              productId={product._id.toString()}
              shopId={shop._id.toString()}
              initialLiked={initiallyLiked}
              initialLikesCount={product.likesCount || 0}
            />
          </div>
          
          <h1 className="text-3xl sm:text-4xl font-serif text-gray-900 mt-2">{product.name}</h1>
          <p className="text-sm text-gray-500 mt-2 font-mono">SKU: {product.sku}</p>

          <div className="mt-6 border-b pb-6">
            <h2 className="text-2xl font-medium text-gray-900">
              {priceLabel}
            </h2>
            {product.originalPrice && product.price && product.originalPrice > product.price && (
              <p className="mt-1 flex items-center gap-2 text-sm">
                <span className="text-gray-400 line-through">₹{product.originalPrice.toLocaleString("en-IN")}</span>
                {product.discountPercentage ? <span className="font-semibold text-emerald-700">{product.discountPercentage}% off</span> : null}
              </p>
            )}
            <p className="text-sm text-gray-500 mt-1">Inclusive of all taxes. Gold rates subject to daily change.</p>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-3 sm:gap-4 mt-6 sm:mt-8">
            {normalizedPhone && (
              <a href={waUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1ebf59] text-white px-3 py-4 rounded-lg font-medium transition-colors shadow-sm min-h-14">
                <MessageCircle className="w-5 h-5" /> WhatsApp
              </a>
            )}
            {normalizedCallNumber && (
              <a href={`tel:${normalizedCallNumber}`} className="flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-3 py-4 rounded-lg font-medium transition-colors shadow-sm min-h-14">
                <Phone className="w-5 h-5" /> Call Store
              </a>
            )}
          </div>

          {/* Details Grid */}
          <div className="mt-12">
            <h3 className="text-lg font-serif font-medium text-gray-900 border-b pb-2 mb-4">Product Specifications</h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
              {product.goldPurity && (
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <dt className="text-gray-500">Gold Purity</dt>
                  <dd className="font-medium text-gray-900">{product.goldPurity}</dd>
                </div>
              )}
              {product.goldWeight && (
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <dt className="text-gray-500">Gross Weight</dt>
                  <dd className="font-medium text-gray-900">{product.goldWeight} g</dd>
                </div>
              )}
              {product.diamondWeight && (
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <dt className="text-gray-500">Diamond Weight</dt>
                  <dd className="font-medium text-gray-900">{product.diamondWeight} ct</dd>
                </div>
              )}
              {product.stoneType && (
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <dt className="text-gray-500">Stone Type</dt>
                  <dd className="font-medium text-gray-900">{product.stoneType}</dd>
                </div>
              )}
            </dl>
          </div>
          
          {/* Description */}
          {product.description && (
            <div className="mt-8 prose prose-sm text-gray-600 max-w-none">
              <h3 className="text-lg font-serif font-medium text-gray-900 mb-2">Description</h3>
              <p>{product.description}</p>
            </div>
          )}

          {/* Trust Badges */}
          <div className="mt-10 bg-gray-50 rounded-lg p-6 flex flex-col sm:flex-row gap-6">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-amber-500 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900 text-sm">Certified Jewellery</p>
                <p className="text-xs text-gray-500">100% Authentic & Hallmarked</p>
              </div>
            </div>
            {(shop.city || shop.state) && (
              <div className="flex items-center gap-3">
                <MapPin className="w-8 h-8 text-amber-500 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900 text-sm">Visit Store</p>
                  <p className="text-xs text-gray-500">{[shop.city, shop.state].filter(Boolean).join(", ")}</p>
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
