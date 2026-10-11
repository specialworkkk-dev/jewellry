import type { StorefrontTemplateId } from "@/lib/storefront-template";

/**
 * "Design of the Week" poll (async server component). Loads its own data and renders nothing when the shop has no
 * running poll and no recent winner. Rendered in the bottom extras, above the posts feed.
 * PLACEHOLDER: replaced by the design-poll build.
 */
export async function DesignOfTheWeek(_props: {
  shop: { _id: { toString(): string }; name: string; slug: string };
  template: StorefrontTemplateId;
}) {
  return null;
}
