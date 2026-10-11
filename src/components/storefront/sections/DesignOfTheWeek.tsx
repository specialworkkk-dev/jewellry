import type { StorefrontTemplateId } from "@/lib/storefront-template";
import { getPublicActorId } from "@/lib/public-actor";
import { loadStorefrontPoll } from "@/lib/design-poll-data";
import { formatIst } from "@/lib/design-poll";
import { DesignPollClient } from "./DesignPollClient";

/**
 * "Design of the Week" poll (async server component). Loads its own data and renders nothing when the shop has no
 * running poll and no recent winner. Rendered in the bottom extras, above the posts feed.
 * The poll definition is cached per shop (zero queries when the shop never made a poll); the visitor's vote and the
 * live tallies are read fresh on every request (the storefront page is dynamic).
 */
export async function DesignOfTheWeek({
  shop,
  template,
}: {
  shop: { _id: { toString(): string }; name: string; slug: string };
  template: StorefrontTemplateId;
}) {
  let poll;
  try {
    poll = await loadStorefrontPoll({ shopId: shop._id.toString(), slug: shop.slug }, getPublicActorId);
  } catch (error) {
    // The poll is an extra: a failure must never take the storefront down.
    console.error("Design of the Week failed to load", error);
    return null;
  }
  if (!poll) return null;

  return (
    <DesignPollClient
      key={`${poll.pollId}:${poll.mode}:${poll.votedProductId ?? ""}`}
      poll={poll}
      template={template}
      shopSlug={shop.slug}
      endsLabel={formatIst(poll.endsAt)}
      closedLabel={poll.closedAt ? formatIst(poll.closedAt) : ""}
    />
  );
}
