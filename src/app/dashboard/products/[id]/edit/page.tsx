import { notFound, redirect } from "next/navigation";
import connectToDatabase from "@/lib/mongoose";
import Product from "@/models/Product";
import Category from "@/models/Category";
import { requireOwnerTenant } from "@/lib/tenant";
import { isObjectId } from "@/lib/validation";
import { isPlanExpired } from "@/components/shop/plan-state";
import { ProductEditForm } from "./ProductEditForm";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { shopId, shop } = await requireOwnerTenant();
  if (!isObjectId(id)) notFound();
  if (isPlanExpired(shop)) redirect("/dashboard/products");
  await connectToDatabase();
  const [product, categories] = await Promise.all([
    Product.findOne({ _id: id, shopId }).lean(),
    Category.find({ $or: [{ isSystemDefault: true }, { shopId }] }).sort({ name: 1 }).select("name").lean(),
  ]);
  if (!product) notFound();

  const initial = {
    id,
    name: product.name,
    sku: product.sku,
    description: product.description ?? "",
    categoryId: product.categoryId?.toString() ?? "",
    goldPurity: product.goldPurity ?? "",
    goldWeight: product.goldWeight != null ? String(product.goldWeight) : "",
    diamondWeight: product.diamondWeight != null ? String(product.diamondWeight) : "",
    stoneType: product.stoneType ?? "",
    priceType: product.priceType,
    // Entered price is the pre-discount value when a discount exists.
    price: (product.originalPrice ?? product.price) != null ? String(product.originalPrice ?? product.price) : "",
    discountType: product.discountType === "FIXED_AMOUNT" ? "FIXED_AMOUNT" as const : "PERCENTAGE" as const,
    discountValue: product.discountValue ? String(product.discountValue) : "",
    makingCharges: product.makingCharges != null ? String(product.makingCharges) : "",
    makingChargesDiscountType: product.makingChargesDiscountType === "FIXED_AMOUNT" ? "FIXED_AMOUNT" as const : "PERCENTAGE" as const,
    makingChargesDiscountValue: product.makingChargesDiscountValue ? String(product.makingChargesDiscountValue) : "",
    images: product.images ?? [],
    videos: product.videos ?? [],
    isPublished: product.isPublished,
  };
  const policy = {
    videoUploadsEnabled: shop.videoUploadsEnabled === true,
    maxVideoDurationSeconds: Math.min(120, Math.max(5, Number(shop.maxVideoDurationSeconds ?? 30))),
    maxVideosPerDay: Math.min(20, Math.max(1, Number(shop.maxVideosPerDay ?? 2))),
  };
  return (
    <ProductEditForm
      initial={initial}
      categories={categories.map((c) => ({ _id: c._id.toString(), name: c.name }))}
      mediaPolicy={policy}
    />
  );
}
