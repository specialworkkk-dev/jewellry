import { Fragment } from "react";
import Link from "next/link";
import { CategoryScroller } from "./CategoryScroller";
import { calculateDiscountedAmount, discountLabel } from "@/lib/product-pricing";
import type { getPublicCatalogue, getPublicShopBySlug } from "@/lib/public-store";

export type StorefrontShop = NonNullable<Awaited<ReturnType<typeof getPublicShopBySlug>>>;
type Catalogue = Awaited<ReturnType<typeof getPublicCatalogue>>;
export type StorefrontProduct = Catalogue["products"][number];

export interface TemplateProps {
  shop: StorefrontShop;
  categories: Catalogue["categories"];
  products: StorefrontProduct[];
  nextCursor?: string | null;
  after?: string;
  activeCategory?: string;
  savedProductIds: string[];
  ownerWhatsApp: string;
}

export const productHref = (shop: StorefrontShop, product: StorefrontProduct) => `/shop/${shop.slug}/product/${product._id}`;

export function enquiryHref(ownerWhatsApp: string, product: StorefrontProduct) {
  if (!ownerWhatsApp) return "#";
  return `https://wa.me/${ownerWhatsApp}?text=${encodeURIComponent(`Hi! I'm interested in ${product.name}. Please share more details.`)}`;
}

type PricedProduct = Pick<StorefrontProduct, "price" | "priceType">;
type DiscountedProduct = Pick<StorefrontProduct, "price" | "originalPrice" | "discountType" | "discountValue" | "discountPercentage">;
type MakingChargeProduct = Pick<StorefrontProduct, "makingCharges" | "makingChargesDiscountType" | "makingChargesDiscountValue">;

export function priceText(product: PricedProduct) {
  if (product.price == null) return "Price on request";
  const amount = `₹${product.price.toLocaleString("en-IN")}`;
  if (product.priceType === "FIXED_PRICE") return amount;
  if (product.priceType === "STARTING_FROM") return `From ${amount}`;
  return "Price on request";
}

export function savingsText(product: DiscountedProduct) {
  if (product.originalPrice == null || product.price == null || product.originalPrice <= product.price) return null;
  return {
    original: `₹${product.originalPrice.toLocaleString("en-IN")}`,
    label: discountLabel(product.discountType, product.discountValue) || (product.discountPercentage ? `${product.discountPercentage}% off` : "Offer"),
  };
}

export function makingChargeText(product: MakingChargeProduct) {
  if (!product.makingCharges || !product.makingChargesDiscountValue) return null;
  const discounted = calculateDiscountedAmount(
    product.makingCharges,
    product.makingChargesDiscountType,
    product.makingChargesDiscountValue,
  );
  return {
    original: `₹${product.makingCharges.toLocaleString("en-IN")}`,
    discounted: `₹${discounted.toLocaleString("en-IN")}`,
    label: discountLabel(product.makingChargesDiscountType, product.makingChargesDiscountValue),
  };
}

export const purityText = (product: StorefrontProduct) => (product.goldPurity ? `${product.goldPurity} gold` : "Fine jewellery");

export function productTags(product: StorefrontProduct) {
  return [
    product.isNewArrival && "New",
    product.isBestseller && "Bestseller",
    product.isBridalCollection && "Bridal",
  ].filter(Boolean) as string[];
}

const collectionHref = (shop: StorefrontShop, category?: string) =>
  `/shop/${shop.slug}${category ? `?category=${encodeURIComponent(category)}` : ""}#collection`;

/** Category filter links. Each template supplies its own look through class names. */
export function CategoryNav({
  props,
  wrap,
  item,
  active,
  idle,
  separator,
}: {
  props: TemplateProps;
  wrap: string;
  item: string;
  active: string;
  idle: string;
  separator?: React.ReactNode;
}) {
  const { shop, categories, activeCategory } = props;
  const isAll = !activeCategory || activeCategory === "all";
  // On phones the filter is one swipeable line (many/long categories never stack into a wall of links).
  const phone = "max-sm:flex-nowrap! max-sm:justify-start! max-sm:overflow-x-auto max-sm:snap-x max-sm:pb-2 max-sm:[scrollbar-width:none] max-sm:[&::-webkit-scrollbar]:hidden";
  const chip = "max-sm:inline-flex max-sm:min-h-11 max-sm:min-w-11 max-sm:justify-center max-sm:max-w-[75vw] max-sm:shrink-0 max-sm:snap-start max-sm:items-center max-sm:whitespace-nowrap";
  return (
    <CategoryScroller label="Collections" className={`${wrap} ${phone}`}>
      <Link href={collectionHref(shop)} aria-current={isAll ? "page" : undefined} className={`${item} ${chip} ${isAll ? active : idle}`}>All</Link>
      {categories.map((category) => (
        <Fragment key={category._id.toString()}>
          {separator}
          <Link href={collectionHref(shop, category.slug)} aria-current={activeCategory === category.slug ? "page" : undefined} title={category.name} className={`${item} ${chip} ${activeCategory === category.slug ? active : idle}`}>
            <span className="max-sm:truncate">{category.name}</span>
          </Link>
        </Fragment>
      ))}
    </CategoryScroller>
  );
}

/** "Back to latest" / "View more" cursor pagination shared by every template. */
export function CataloguePager({ props, wrap, back, more }: { props: TemplateProps; wrap: string; back: string; more: string }) {
  const { shop, nextCursor, after, activeCategory } = props;
  if (!nextCursor && !after) return null;
  const hasCategory = activeCategory && activeCategory !== "all";
  return (
    <nav aria-label="Catalogue pages" className={wrap}>
      {after && (
        <Link href={collectionHref(shop, hasCategory ? activeCategory : undefined)} className={back}>Back to latest</Link>
      )}
      {nextCursor && (
        <Link
          href={`/shop/${shop.slug}?${new URLSearchParams({ ...(hasCategory ? { category: activeCategory } : {}), after: nextCursor }).toString()}#collection`}
          className={more}
        >
          View more designs
        </Link>
      )}
    </nav>
  );
}

export const EMPTY_COPY = "New designs are being prepared. Please check back soon.";
export const DEFAULT_TAGLINE = "Timeless designs, trusted craftsmanship and jewellery made for life’s most precious moments.";

export const chatHref = (shop: StorefrontShop, ownerWhatsApp: string) =>
  !ownerWhatsApp ? "#" : `https://wa.me/${ownerWhatsApp}?text=${encodeURIComponent(`Hi ${shop.name}, I would like help choosing jewellery.`)}`;
