import connectToDatabase from "@/lib/mongoose";
import Shop from "@/models/Shop";
import Product from "@/models/Product";
import { notFound } from "next/navigation";
import { CinematicHero } from "@/components/public/CinematicHero";
import { StoreImage } from "@/components/public/StoreImage";

// Optional: Optimize Next.js dynamic rendering
// export const revalidate = 60; // revalidate every 60 seconds

import Category from "@/models/Category";
import Link from "next/link";
import { MessageCircle } from "lucide-react";

const normalizeWhatsAppNumber = (value?: string) => (value || "").replace(/\D/g, "");

export default async function PublicShopPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ category?: string }>;
}) {
  await connectToDatabase();
  
  const { slug } = await params;
  const { category: activeCategory } = await searchParams;
  const shop = await Shop.findOne({ slug, isApproved: true });
  if (!shop) notFound();

  // Fetch all categories for this shop
  const categories = await Category.find({ $or: [{ shopId: shop._id }, { isSystemDefault: true }] });

  // Build the product query
  const query: any = { shopId: shop._id, isPublished: true };
  if (activeCategory && activeCategory !== "all") {
    const categoryDoc = categories.find(c => c.slug === activeCategory);
    if (categoryDoc) {
      query.categoryId = categoryDoc._id;
    }
  }

  // Fetch products
  const products = await Product.find(query)
    .sort({ createdAt: -1 })
    .limit(20);

  return (
    <div>
      <CinematicHero 
        coverUrl={shop.coverUrl} 
        shopName={shop.name} 
        shortDescription={shop.shortDescription} 
      />

      {/* 2. RECENT PRODUCTS GRID */}

      <div id="collection" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 scroll-mt-20">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <h3 className="text-2xl font-serif font-medium text-gray-900">Latest Collection</h3>
          
          {/* Category Tabs */}
          <div className="flex overflow-x-auto w-full sm:w-auto space-x-2 pb-2 sm:pb-0 scrollbar-hide">
            <Link 
              href={`/shop/${shop.slug}#collection`}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${!activeCategory || activeCategory === "all" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              All Items
            </Link>
            {categories.map(cat => (
              <Link 
                key={cat._id.toString()}
                href={`/shop/${shop.slug}?category=${cat.slug}#collection`}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeCategory === cat.slug ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </div>
        
        {products.length === 0 ? (
          <div className="py-20 text-center text-gray-500">
            No products published yet. Check back later!
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10 sm:gap-x-6">
            {products.map((product) => {
              const ownerWhatsApp = normalizeWhatsAppNumber(shop.whatsappNumber);
              const message = encodeURIComponent(`Hi! I'm interested in ${product.name}. Please share more details.`);
              const enquiryUrl = ownerWhatsApp ? `https://wa.me/${ownerWhatsApp}?text=${message}` : "#";

              return (
                <div key={product._id.toString()} className="group relative">
                  <div className="aspect-[4/5] w-full overflow-hidden rounded-lg bg-gray-100">
                    {product.images?.[0] ? (
                      <StoreImage
                        src={product.images[0]}
                        alt={product.name}
                        className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-gray-300">No Image</div>
                    )}
                  </div>
                  <div className="mt-4 flex flex-col">
                    <h3 className="text-sm text-gray-700 font-medium line-clamp-1">
                      <a href={`/shop/${shop.slug}/product/${product._id}`}>
                        <span aria-hidden="true" className="absolute inset-0" />
                        {product.name}
                      </a>
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">{product.goldPurity} Gold</p>
                    <p className="mt-2 text-sm font-medium text-gray-900">
                      {product.priceType === 'FIXED_PRICE' ? `₹${product.price?.toLocaleString('en-IN')}` : 'Price on Request'}
                    </p>
                    <a
                      href={enquiryUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-3 py-2 text-xs font-medium text-white hover:bg-[#1ebf59] transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> Enquire
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
