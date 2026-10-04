import connectToDatabase from "@/lib/mongoose";
import Shop from "@/models/Shop";
import Product from "@/models/Product";
import "@/models/Category";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageCircle, Phone, ShieldCheck, MapPin } from "lucide-react";
import Link from "next/link";
import { Metadata, ResolvingMetadata } from "next";
import { ProductActionButtons } from "@/components/public/ProductActionButtons";
import { EnquiryForm } from "@/components/public/EnquiryForm";

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string; id: string }> },
  parent: ResolvingMetadata
): Promise<Metadata> {
  await connectToDatabase();
  
  const { slug, id } = await params;
  const shop = await Shop.findOne({ slug, isApproved: true });
  if (!shop) return { title: "Not Found" };

  try {
    const product = await Product.findById(id);
    if (!product || !product.isPublished) return { title: "Not Found" };

    const previousImages = (await parent).openGraph?.images || [];
    const images = product.images?.[0] ? [product.images[0], ...previousImages] : previousImages;

    return {
      title: `${product.name} | ${shop.name}`,
      description: product.description || `Buy ${product.name} at ${shop.name}`,
      openGraph: {
        title: product.name,
        description: product.description || `Premium Jewellery at ${shop.name}`,
        url: `https://example.com/shop/${shop.slug}/product/${product._id}`,
        siteName: shop.name,
        images,
        locale: 'en_IN',
        type: 'website',
      },
    };
  } catch (e) {
    return { title: "Not Found" };
  }
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  await connectToDatabase();
  
  const { slug, id } = await params;
  const shop = await Shop.findOne({ slug, isApproved: true });
  if (!shop) notFound();

  let product;
  try {
    product = await Product.findById(id).populate('categoryId');
    if (!product || product.shopId.toString() !== shop._id.toString() || !product.isPublished) {
      notFound();
    }
  } catch (e) {
    notFound(); // Handle invalid ObjectId
  }

  const normalizedPhone = (shop.whatsappNumber || "").replace(/\D/g, "");
  const waMessage = encodeURIComponent(`Hi! I'm interested in this product: ${product.name} (SKU: ${product.sku}). Could you provide more details?`);
  const waUrl = normalizedPhone ? `https://wa.me/${normalizedPhone}?text=${waMessage}` : "#";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Breadcrumb / Back button */}
      <div className="mb-8">
        <Link href={`/shop/${shop.slug}`} className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to {shop.name}
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
        
        {/* Left: Image Gallery */}
        <div className="flex flex-col gap-4">
          <div className="w-full aspect-[4/5] bg-gray-100 rounded-lg overflow-hidden border">
            {product.images?.[0] ? (
              <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">No Image Available</div>
            )}
          </div>
          {/* Thumbnail Strip Placeholder */}
          {product.images && product.images.length > 1 && (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {product.images.map((img: string, idx: number) => (
                <div key={idx} className="w-20 h-20 flex-shrink-0 bg-gray-100 rounded-md overflow-hidden border cursor-pointer hover:border-black transition-colors">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Product Details */}
        <div className="flex flex-col pt-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium tracking-widest text-amber-600 uppercase">{product.goldPurity || 'Premium'} Jewellery</p>
            <ProductActionButtons productName={product.name} />
          </div>
          
          <h1 className="text-3xl sm:text-4xl font-serif text-gray-900 mt-2">{product.name}</h1>
          <p className="text-sm text-gray-500 mt-2 font-mono">SKU: {product.sku}</p>

          <div className="mt-6 border-b pb-6">
            <h2 className="text-2xl font-medium text-gray-900">
              {product.priceType === 'FIXED_PRICE' ? `₹${product.price?.toLocaleString('en-IN')}` : 'Price on Request'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">Inclusive of all taxes. Gold rates subject to daily change.</p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <a href={waUrl} target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1ebf59] text-white py-4 rounded-lg font-medium transition-colors shadow-sm">
              <MessageCircle className="w-5 h-5" /> Enquire on WhatsApp
            </a>
            <a href={`tel:${shop.businessPhone}`} className="flex-1 flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white py-4 rounded-lg font-medium transition-colors shadow-sm">
              <Phone className="w-5 h-5" /> Call Store
            </a>
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
