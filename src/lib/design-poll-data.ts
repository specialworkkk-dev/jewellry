import "server-only";

import { createHash } from "node:crypto";
import { unstable_cache, revalidateTag } from "next/cache";
import { after } from "next/server";
import { Types } from "mongoose";
import connectToDatabase from "@/lib/mongoose";
import DesignPoll from "@/models/DesignPoll";
import DesignVote from "@/models/DesignVote";
import Product from "@/models/Product";
import Shop from "@/models/Shop";
import AnalyticsEvent from "@/models/AnalyticsEvent";
import Interaction from "@/models/Interaction";
import { isDuplicateKeyError } from "@/lib/validation";
import { scheduleShopEvent } from "@/lib/realtime";
import { PUBLIC_STORE_TAG, publicStoreShopTag, publicStoreSlugTag } from "@/lib/public-store-cache";
import {
  computeEndsAt,
  featuredUntil,
  pollPhase,
  resolveWinner,
  storefrontVisibility,
  validatePollInput,
  type InsightRow,
} from "@/lib/design-poll";

// ---------------------------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------------------------

/** Lean poll document as stored. */
export interface PollRecord {
  _id: Types.ObjectId;
  shopId: Types.ObjectId;
  title: string;
  candidates: { productId: Types.ObjectId; votes: number }[];
  totalVotes: number;
  status: "ACTIVE" | "CLOSED";
  startsAt: Date;
  endsAt: Date;
  closedAt?: Date;
  winnerProductId?: Types.ObjectId;
  endedEarly?: boolean;
  flagsAppliedAt?: Date;
  flagsClearedAt?: Date;
  createdAt: Date;
}

export interface ShopRef {
  shopId: string;
  slug: string;
}

export interface PollResults {
  status: "ACTIVE" | "CLOSED";
  totalVotes: number;
  votes: { productId: string; votes: number }[];
  winnerProductId: string | null;
}

export function toResults(poll: Pick<PollRecord, "status" | "totalVotes" | "candidates" | "winnerProductId">): PollResults {
  return {
    status: poll.status,
    totalVotes: poll.totalVotes,
    votes: poll.candidates.map((c) => ({ productId: c.productId.toString(), votes: c.votes })),
    winnerProductId: poll.winnerProductId ? poll.winnerProductId.toString() : null,
  };
}

// ---------------------------------------------------------------------------------------------
// Index readiness
// ---------------------------------------------------------------------------------------------

let indexesReady: Promise<unknown> | null = null;

/**
 * The "one active poll per shop" and "one vote per visitor" guarantees are unique indexes. Wait for them to be
 * built before the first write so a cold start cannot slip a duplicate in. Retried after a failure.
 */
export function ensurePollIndexes() {
  if (!indexesReady) {
    indexesReady = Promise.all([DesignPoll.init(), DesignVote.init()]).catch((error: unknown) => {
      indexesReady = null;
      console.error("Design poll index build failed", error);
    });
  }
  return indexesReady;
}

// ---------------------------------------------------------------------------------------------
// Cache invalidation
// ---------------------------------------------------------------------------------------------

export function designPollTag(shopId: string) {
  return `design-poll:${shopId}`;
}

function invalidateNow({ shopId, slug }: ShopRef) {
  revalidateTag(designPollTag(shopId), { expire: 0 });
  revalidateTag(publicStoreShopTag(shopId), { expire: 0 });
  if (slug) revalidateTag(publicStoreSlugTag(slug), { expire: 0 });
}

/**
 * Expire the cached poll definition and the shop's public data (the winner flag shows on product tags).
 * Route handlers call it directly; during a page render revalidateTag is not allowed, so pass `deferred`
 * to run it after the response is sent.
 */
export function invalidatePollCaches(shop: ShopRef, options: { deferred?: boolean } = {}) {
  const run = () => {
    try {
      invalidateNow(shop);
    } catch (error) {
      console.error("Design poll cache invalidation failed", error);
    }
  };
  if (!options.deferred) return run();
  try {
    after(run);
  } catch {
    run();
  }
}

// ---------------------------------------------------------------------------------------------
// Closing
// ---------------------------------------------------------------------------------------------

async function applyWinnerFlags(shopId: Types.ObjectId, winnerProductId: Types.ObjectId | null) {
  // Everything except the winner loses the flag; the winner gains it. Both statements are idempotent.
  await Product.updateMany(
    { shopId, isDesignOfTheWeek: true, ...(winnerProductId ? { _id: { $ne: winnerProductId } } : {}) },
    { $set: { isDesignOfTheWeek: false } },
    { timestamps: false },
  );
  if (winnerProductId) {
    await Product.updateOne({ _id: winnerProductId, shopId }, { $set: { isDesignOfTheWeek: true } }, { timestamps: false });
  }
}

/**
 * Close a poll whose end has passed. Safe under any number of concurrent callers: the status flip is a single
 * conditional findOneAndUpdate, so exactly one caller "wins" it (closedNow = true) and runs the side effects.
 *
 * Final counts come from the vote documents, not from the live counters. The counters can only be behind by
 * a vote whose increment failed after its insert (see castVote), so recounting makes the stored result exact.
 */
export async function closeDuePoll(
  pollId: string | Types.ObjectId,
  now: number = Date.now(),
): Promise<{ poll: PollRecord | null; closedNow: boolean }> {
  await connectToDatabase();
  const current = await DesignPoll.findOne({ _id: pollId }).lean<PollRecord>();
  if (!current) return { poll: null, closedNow: false };
  if (current.status === "CLOSED") return { poll: current, closedNow: false };
  if (new Date(current.endsAt).getTime() > now) return { poll: current, closedNow: false };

  const counts = await DesignVote.aggregate<{ _id: Types.ObjectId; n: number }>([
    { $match: { pollId: current._id } },
    { $group: { _id: "$productId", n: { $sum: 1 } } },
  ]);
  const byProduct = new Map(counts.map((row) => [row._id.toString(), row.n]));
  const candidates = current.candidates.map((c) => ({ productId: c.productId, votes: byProduct.get(c.productId.toString()) ?? 0 }));
  const totalVotes = candidates.reduce((sum, c) => sum + c.votes, 0);
  const winnerId = resolveWinner(candidates.map((c) => ({ productId: c.productId.toString(), votes: c.votes })));

  const closed = await DesignPoll.findOneAndUpdate(
    { _id: current._id, status: "ACTIVE", endsAt: { $lte: new Date(now) } },
    {
      $set: {
        status: "CLOSED",
        closedAt: new Date(now),
        candidates,
        totalVotes,
        ...(winnerId ? { winnerProductId: new Types.ObjectId(winnerId) } : {}),
      },
    },
    { returnDocument: "after" },
  ).lean<PollRecord>();

  if (!closed) {
    // Another request closed it between our read and our update.
    const settled = await DesignPoll.findOne({ _id: current._id }).lean<PollRecord>();
    return { poll: settled, closedNow: false };
  }

  let flagsAppliedAt: Date | undefined;
  try {
    await applyWinnerFlags(closed.shopId, closed.winnerProductId ?? null);
    flagsAppliedAt = new Date();
    await DesignPoll.updateOne({ _id: closed._id }, { $set: { flagsAppliedAt } });
  } catch (error) {
    // flagsAppliedAt stays unset, so the storefront read repairs it (reconcileClosedPoll).
    console.error("Design poll winner flags failed", error);
  }
  try {
    scheduleShopEvent(closed.shopId.toString(), "shop.settings.updated", "both", closed._id.toString());
  } catch (error) {
    console.error("Design poll realtime event failed", error);
  }
  return { poll: { ...closed, flagsAppliedAt }, closedNow: true };
}

/** Close the shop's overdue active poll, if any. Returns true when this call closed one. */
export async function closeExpiredPollForShop(shopId: string, now: number = Date.now()) {
  await connectToDatabase();
  const overdue = await DesignPoll.findOne({ shopId: new Types.ObjectId(shopId), status: "ACTIVE", endsAt: { $lte: new Date(now) } })
    .select("_id")
    .lean<{ _id: Types.ObjectId }>();
  if (!overdue) return false;
  return (await closeDuePoll(overdue._id, now)).closedNow;
}

/**
 * Housekeeping for an already-closed poll, best effort and idempotent:
 *  - repair a missing flag write (a crash between closing and flagging),
 *  - clear the flag once the 7-day featuring window is over.
 * Returns true when it changed something (caller invalidates caches).
 */
export async function reconcileClosedPoll(poll: PollRecord, now: number = Date.now()) {
  if (poll.status !== "CLOSED" || !poll.closedAt) return false;
  try {
    const windowOver = now >= featuredUntil(poll.closedAt).getTime();
    if (windowOver) {
      if (poll.flagsClearedAt) return false;
      // Claim the clear so concurrent renders do it once.
      const claimed = await DesignPoll.findOneAndUpdate(
        { _id: poll._id, flagsClearedAt: { $exists: false } },
        { $set: { flagsClearedAt: new Date(now) } },
      ).lean();
      if (!claimed) return false;
      // Only clear when this is still the shop's latest poll; a newer close has already rewritten the flags.
      const newer = await DesignPoll.exists({ shopId: poll.shopId, _id: { $gt: poll._id } });
      if (!newer && poll.winnerProductId) {
        await Product.updateMany({ shopId: poll.shopId, isDesignOfTheWeek: true }, { $set: { isDesignOfTheWeek: false } }, { timestamps: false });
      }
      return true;
    }
    if (!poll.flagsAppliedAt) {
      await applyWinnerFlags(poll.shopId, poll.winnerProductId ?? null);
      await DesignPoll.updateOne({ _id: poll._id }, { $set: { flagsAppliedAt: new Date(now) } });
      return true;
    }
  } catch (error) {
    console.error("Design poll reconcile failed", error);
  }
  return false;
}

// ---------------------------------------------------------------------------------------------
// Owner actions
// ---------------------------------------------------------------------------------------------

export type CreatePollOutcome =
  | { ok: true; pollId: string; endsAt: Date }
  | { ok: false; status: number; error: string };

export async function createPoll(
  shop: ShopRef,
  input: { title?: unknown; productIds?: unknown; durationDays?: unknown },
  now: number = Date.now(),
): Promise<CreatePollOutcome> {
  const parsed = validatePollInput(input);
  if (!parsed.ok) return { ok: false, status: 400, error: parsed.error };

  await connectToDatabase();
  await ensurePollIndexes();
  const shopObjectId = new Types.ObjectId(shop.shopId);

  // An overdue poll that nobody has read yet must not block the next one.
  await closeExpiredPollForShop(shop.shopId, now);

  const ids = parsed.productIds.map((id) => new Types.ObjectId(id));
  const eligible = await Product.countDocuments({ _id: { $in: ids }, shopId: shopObjectId, isPublished: true, stockStatus: "IN_STOCK" });
  if (eligible !== ids.length) {
    return { ok: false, status: 400, error: "Every design must be one of your published products that is in stock" };
  }

  const endsAt = computeEndsAt(now, parsed.durationDays);
  try {
    const poll = await DesignPoll.create({
      shopId: shopObjectId,
      title: parsed.title,
      candidates: ids.map((productId) => ({ productId, votes: 0 })),
      totalVotes: 0,
      status: "ACTIVE",
      startsAt: new Date(now),
      endsAt,
    });
    return { ok: true, pollId: poll._id.toString(), endsAt };
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return { ok: false, status: 409, error: "A poll is already running. End it first to start a new one." };
    }
    throw error;
  }
}

export type EndPollOutcome =
  | { ok: true; closed: PollRecord | null }
  | { ok: false; status: number; error: string };

/** Owner ends their own poll now. The shop id comes from the verified session, never from the request. */
export async function endPollEarly(shopId: string, pollId: string, now: number = Date.now()): Promise<EndPollOutcome> {
  await connectToDatabase();
  const shopObjectId = new Types.ObjectId(shopId);
  const owned = await DesignPoll.findOne({ _id: pollId, shopId: shopObjectId }).select("status").lean<{ status: string }>();
  if (!owned) return { ok: false, status: 404, error: "Poll not found" };
  if (owned.status !== "ACTIVE") return { ok: false, status: 409, error: "This poll has already ended" };

  // Pull the end forward to now (only while still active and not already past), then close through the shared path.
  await DesignPoll.updateOne(
    { _id: pollId, shopId: shopObjectId, status: "ACTIVE", endsAt: { $gt: new Date(now) } },
    { $set: { endsAt: new Date(now), endedEarly: true } },
  );
  const { poll } = await closeDuePoll(pollId, now);
  return { ok: true, closed: poll };
}

// ---------------------------------------------------------------------------------------------
// Voting
// ---------------------------------------------------------------------------------------------

export type VoteOutcome =
  | { kind: "voted"; results: PollResults; votedProductId: string }
  | { kind: "already"; results: PollResults; votedProductId: string }
  | { kind: "ended"; results: PollResults; closedNow: boolean }
  | { kind: "not_found" }
  | { kind: "bad_product" };

/**
 * Record one vote. Order: (1) insert the vote, (2) increment the tally.
 *
 * - The unique (pollId, actorId) index makes step 1 the single gate: a double click, a replay or two tabs all
 *   collide there and only one of them ever reaches step 2, so a vote can never be counted twice.
 * - Step 2 is conditional on the poll still being ACTIVE, not past endsAt and containing the product, so the
 *   tally can never move after the poll's end.
 * - If step 2 matches nothing (the poll ended in between) or throws, the vote is deleted again (compensation),
 *   so a failed tally does not leave an orphan vote that blocks the visitor.
 * - If even the compensation is lost (process dies between the two statements) the vote is simply an
 *   un-incremented orphan. That cannot corrupt anything: closeDuePoll recounts from the vote documents, so the
 *   final result still includes it (the visitor was told they voted), and the live bar is at worst one short.
 *   The reverse order (increment first) would instead risk a counted vote with no record, and the same visitor
 *   could then vote again, which is why the insert goes first.
 */
export async function castVote(args: {
  pollId: string;
  productId: string;
  actorId: string;
  now?: number;
}): Promise<VoteOutcome & { shop?: ShopRef }> {
  const now = args.now ?? Date.now();
  await connectToDatabase();
  await ensurePollIndexes();
  const pollObjectId = new Types.ObjectId(args.pollId);
  const productObjectId = new Types.ObjectId(args.productId);
  const actorObjectId = new Types.ObjectId(args.actorId);

  const poll = await DesignPoll.findOne({ _id: pollObjectId }).lean<PollRecord>();
  if (!poll) return { kind: "not_found" };
  const shop = await connectShop(poll.shopId);
  if (!shop) return { kind: "not_found" };

  if (pollPhase(poll, now) !== "ACTIVE") {
    const closed = await closeDuePoll(pollObjectId, now);
    return { kind: "ended", results: toResults(closed.poll ?? poll), closedNow: closed.closedNow, shop };
  }
  if (!poll.candidates.some((c) => c.productId.equals(productObjectId))) return { kind: "bad_product", shop };
  const stillListed = await Product.exists({ _id: productObjectId, shopId: poll.shopId, isPublished: true });
  if (!stillListed) return { kind: "bad_product", shop };

  let voteId: Types.ObjectId;
  try {
    const vote = await DesignVote.create({ pollId: pollObjectId, shopId: poll.shopId, actorId: actorObjectId, productId: productObjectId });
    voteId = vote._id;
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    const earlier = await DesignVote.findOne({ pollId: pollObjectId, actorId: actorObjectId }).select("productId").lean<{ productId: Types.ObjectId }>();
    const fresh = await DesignPoll.findOne({ _id: pollObjectId }).lean<PollRecord>();
    return { kind: "already", results: toResults(fresh ?? poll), votedProductId: (earlier?.productId ?? productObjectId).toString(), shop };
  }

  let updated: PollRecord | null = null;
  try {
    updated = await DesignPoll.findOneAndUpdate(
      {
        _id: pollObjectId,
        status: "ACTIVE",
        endsAt: { $gt: new Date(Math.max(now, Date.now())) },
        "candidates.productId": productObjectId,
      },
      { $inc: { "candidates.$.votes": 1, totalVotes: 1 } },
      { returnDocument: "after" },
    ).lean<PollRecord>();
  } catch (error) {
    await DesignVote.deleteOne({ _id: voteId }).catch(() => undefined);
    throw error;
  }

  if (!updated) {
    await DesignVote.deleteOne({ _id: voteId }).catch(() => undefined);
    const closed = await closeDuePoll(pollObjectId, Date.now());
    return { kind: "ended", results: toResults(closed.poll ?? poll), closedNow: closed.closedNow, shop };
  }
  return { kind: "voted", results: toResults(updated), votedProductId: productObjectId.toString(), shop };
}

async function connectShop(shopId: Types.ObjectId): Promise<ShopRef | null> {
  const shop = await Shop.findOne({ _id: shopId, isApproved: true, isActive: true }).select("slug").lean<{ slug: string }>();
  return shop ? { shopId: shopId.toString(), slug: shop.slug } : null;
}

/** Tallies for the results endpoint; only meant for a voter or a closed poll (the route decides). */
export async function readPollForResults(pollId: string, actorId: string | undefined, now: number = Date.now()) {
  await connectToDatabase();
  let poll = await DesignPoll.findOne({ _id: pollId }).lean<PollRecord>();
  if (!poll) return null;
  const shop = await connectShop(poll.shopId);
  if (!shop) return null;
  let closedNow = false;
  if (pollPhase(poll, now) === "AWAITING_CLOSE") {
    const closed = await closeDuePoll(poll._id, now);
    closedNow = closed.closedNow;
    if (closed.poll) poll = closed.poll;
  }
  let votedProductId: string | null = null;
  if (actorId && Types.ObjectId.isValid(actorId)) {
    const vote = await DesignVote.findOne({ pollId: poll._id, actorId: new Types.ObjectId(actorId) }).select("productId").lean<{ productId: Types.ObjectId }>();
    votedProductId = vote ? vote.productId.toString() : null;
  }
  return { poll, shop, closedNow, votedProductId, results: toResults(poll) };
}

// ---------------------------------------------------------------------------------------------
// Storefront
// ---------------------------------------------------------------------------------------------

const CACHE_NAMESPACE = createHash("sha256")
  .update(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/jewellery-saas")
  .digest("hex")
  .slice(0, 12);

interface PollDefinition {
  id: string;
  title: string;
  status: "ACTIVE" | "CLOSED";
  startsAt: string;
  endsAt: string;
  closedAt: string | null;
  winnerProductId: string | null;
  flagsAppliedAt: string | null;
  flagsClearedAt: string | null;
  /** Candidates that are still published, in the owner's order. */
  candidates: { productId: string; name: string; image: string }[];
  /** Final tallies, only for a closed poll (they cannot change any more). */
  finalVotes: Record<string, number> | null;
}

/**
 * The poll's definition (title, candidates, product names and photos, final tallies of a closed poll), cached per
 * shop. A shop that never made a poll caches `null`, so its storefront costs zero queries. Per-visitor state and
 * live tallies are NOT cached (see loadStorefrontPoll).
 */
function getPollDefinition(shopId: string): Promise<PollDefinition | null> {
  return unstable_cache(
    async (): Promise<PollDefinition | null> => {
      await connectToDatabase();
      const poll = await DesignPoll.findOne({ shopId: new Types.ObjectId(shopId) }).sort({ createdAt: -1 }).lean<PollRecord>();
      if (!poll) return null;
      const products = await Product.find({ _id: { $in: poll.candidates.map((c) => c.productId) }, shopId: poll.shopId, isPublished: true })
        .select("name images")
        .lean<{ _id: Types.ObjectId; name: string; images?: string[] }[]>();
      const byId = new Map(products.map((p) => [p._id.toString(), p]));
      const candidates = poll.candidates.flatMap((c) => {
        const product = byId.get(c.productId.toString());
        return product ? [{ productId: c.productId.toString(), name: product.name, image: product.images?.[0] ?? "" }] : [];
      });
      return {
        id: poll._id.toString(),
        title: poll.title,
        status: poll.status,
        startsAt: new Date(poll.startsAt).toISOString(),
        endsAt: new Date(poll.endsAt).toISOString(),
        closedAt: poll.closedAt ? new Date(poll.closedAt).toISOString() : null,
        winnerProductId: poll.winnerProductId ? poll.winnerProductId.toString() : null,
        flagsAppliedAt: poll.flagsAppliedAt ? new Date(poll.flagsAppliedAt).toISOString() : null,
        flagsClearedAt: poll.flagsClearedAt ? new Date(poll.flagsClearedAt).toISOString() : null,
        candidates,
        finalVotes: poll.status === "CLOSED"
          ? Object.fromEntries(poll.candidates.map((c) => [c.productId.toString(), c.votes]))
          : null,
      };
    },
    ["design-poll-definition", CACHE_NAMESPACE, shopId],
    { revalidate: 600, tags: [PUBLIC_STORE_TAG, publicStoreShopTag(shopId), designPollTag(shopId)] },
  )();
}

export interface StorefrontPoll {
  pollId: string;
  title: string;
  mode: "VOTING" | "WINNER";
  endsAt: string;
  closedAt: string | null;
  serverNow: number;
  winnerProductId: string | null;
  votedProductId: string | null;
  /** Tallies are withheld from visitors who have not voted yet (no bandwagon, nothing to scrape). */
  showResults: boolean;
  totalVotes: number;
  candidates: { productId: string; name: string; image: string; votes: number }[];
}

/**
 * Everything the storefront section needs. Queries: 0 when the shop never ran a poll or the poll is closed and a
 * visitor is anonymous; 2 (poll tallies by _id + this visitor's vote by unique index) while voting is open.
 */
export async function loadStorefrontPoll(
  shop: ShopRef,
  resolveActorId: () => Promise<string | undefined>,
  now: number = Date.now(),
): Promise<StorefrontPoll | null> {
  const def = await getPollDefinition(shop.shopId);
  if (!def) return null;
  const pollObjectId = new Types.ObjectId(def.id);
  // The visitor identity is only resolved once we know there is a poll worth showing.
  const voteQuery = async () => {
    const actorId = await resolveActorId();
    if (!actorId || !Types.ObjectId.isValid(actorId)) return null;
    return DesignVote.findOne({ pollId: pollObjectId, actorId: new Types.ObjectId(actorId) })
      .select("productId")
      .lean<{ productId: Types.ObjectId }>();
  };

  let poll: PollRecord | null = null;
  let votedRecord: { productId: Types.ObjectId } | null = null;
  let stale = false;

  if (def.status === "ACTIVE") {
    const [fresh, vote] = await Promise.all([
      DesignPoll.findOne({ _id: pollObjectId }).lean<PollRecord>(),
      voteQuery(),
    ]);
    poll = fresh;
    votedRecord = vote;
    if (!poll) return null;
    if (poll.status === "ACTIVE" && pollPhase(poll, now) === "AWAITING_CLOSE") {
      const closed = await closeDuePoll(pollObjectId, now);
      poll = closed.poll ?? poll;
      stale = true;
    } else if (poll.status === "CLOSED") {
      stale = true; // ended early or closed elsewhere while the cache still says ACTIVE
    }
  } else {
    votedRecord = await voteQuery();
    poll = {
      _id: pollObjectId,
      shopId: new Types.ObjectId(shop.shopId),
      title: def.title,
      candidates: def.candidates.map((c) => ({ productId: new Types.ObjectId(c.productId), votes: def.finalVotes?.[c.productId] ?? 0 })),
      totalVotes: 0,
      status: "CLOSED",
      startsAt: new Date(def.startsAt),
      endsAt: new Date(def.endsAt),
      closedAt: def.closedAt ? new Date(def.closedAt) : undefined,
      winnerProductId: def.winnerProductId ? new Types.ObjectId(def.winnerProductId) : undefined,
      flagsAppliedAt: def.flagsAppliedAt ? new Date(def.flagsAppliedAt) : undefined,
      flagsClearedAt: def.flagsClearedAt ? new Date(def.flagsClearedAt) : undefined,
      createdAt: new Date(def.startsAt),
    };
  }

  if (poll.status === "CLOSED") {
    if (def.status === "CLOSED" || stale) {
      if (await reconcileClosedPoll(poll, now)) stale = true;
    }
    if (stale) invalidatePollCaches(shop, { deferred: true });
  }

  const visibility = storefrontVisibility(
    { status: poll.status, endsAt: poll.endsAt, closedAt: poll.closedAt, winnerProductId: poll.winnerProductId?.toString() ?? null },
    now,
  );
  if (visibility === "HIDDEN") return null;

  const tally = new Map(poll.candidates.map((c) => [c.productId.toString(), c.votes]));
  // Product names/photos come from the (possibly slightly older) cached definition; a closed poll from the closed doc.
  const candidates = def.candidates.map((c) => ({ ...c, votes: tally.get(c.productId) ?? 0 }));
  if (visibility === "VOTING" && candidates.length < 2) return null;
  const winnerProductId = poll.winnerProductId?.toString() ?? null;
  if (visibility === "WINNER" && !candidates.some((c) => c.productId === winnerProductId)) return null;

  const votedProductId = votedRecord ? votedRecord.productId.toString() : null;
  const showResults = visibility === "WINNER" || votedProductId !== null;
  return {
    pollId: def.id,
    title: poll.title,
    mode: visibility,
    endsAt: new Date(poll.endsAt).toISOString(),
    closedAt: poll.closedAt ? new Date(poll.closedAt).toISOString() : null,
    serverNow: now,
    winnerProductId,
    votedProductId,
    showResults,
    totalVotes: showResults ? candidates.reduce((sum, c) => sum + c.votes, 0) : 0,
    candidates: candidates.map((c) => ({ ...c, votes: showResults ? c.votes : 0 })),
  };
}

// ---------------------------------------------------------------------------------------------
// Owner dashboard
// ---------------------------------------------------------------------------------------------

export interface OwnerPollRow extends InsightRow {
  image: string;
  percentOfVotes: number;
  isWinner: boolean;
}

export interface OwnerPoll {
  id: string;
  title: string;
  status: "ACTIVE" | "CLOSED";
  startsAt: string;
  endsAt: string;
  closedAt: string | null;
  endedEarly: boolean;
  totalVotes: number;
  winnerName: string | null;
  rows: OwnerPollRow[];
  hasInsights: boolean;
}

/** Views, saves and WhatsApp taps per design inside the poll window, as three small indexed aggregations. */
async function loadInsights(shopId: Types.ObjectId, productIds: Types.ObjectId[], from: Date, to: Date) {
  const window = { $gte: from, $lte: to };
  const [events, saves] = await Promise.all([
    AnalyticsEvent.aggregate<{ _id: { t: Types.ObjectId; e: string }; n: number }>([
      { $match: { shopId, eventType: { $in: ["PRODUCT_VIEW", "WHATSAPP_CLICK"] }, createdAt: window, targetId: { $in: productIds } } },
      { $group: { _id: { t: "$targetId", e: "$eventType" }, n: { $sum: 1 } } },
    ]),
    Interaction.aggregate<{ _id: Types.ObjectId; n: number }>([
      { $match: { shopId, interactionType: "LIKE", targetType: "PRODUCT", targetId: { $in: productIds }, createdAt: window } },
      { $group: { _id: "$targetId", n: { $sum: 1 } } },
    ]),
  ]);
  const views = new Map<string, number>();
  const taps = new Map<string, number>();
  for (const row of events) (row._id.e === "PRODUCT_VIEW" ? views : taps).set(row._id.t.toString(), row.n);
  return { views, taps, saves: new Map(saves.map((row) => [row._id.toString(), row.n])) };
}

const INSIGHT_POLLS = 4;
const HISTORY_POLLS = 12;

/** The owner page: closes any overdue poll first, then returns the latest polls with sales signals. */
export async function loadOwnerPolls(shop: ShopRef, now: number = Date.now()) {
  await connectToDatabase();
  const shopObjectId = new Types.ObjectId(shop.shopId);
  const closedNow = await closeExpiredPollForShop(shop.shopId, now);
  if (closedNow) invalidatePollCaches(shop, { deferred: true });

  const polls = await DesignPoll.find({ shopId: shopObjectId }).sort({ createdAt: -1 }).limit(HISTORY_POLLS).lean<PollRecord[]>();
  if (polls.length === 0) return [] as OwnerPoll[];

  const allIds = [...new Set(polls.flatMap((p) => p.candidates.map((c) => c.productId.toString())))].map((id) => new Types.ObjectId(id));
  const products = await Product.find({ _id: { $in: allIds }, shopId: shopObjectId })
    .select("name images")
    .lean<{ _id: Types.ObjectId; name: string; images?: string[] }[]>();
  const byId = new Map(products.map((p) => [p._id.toString(), p]));

  return Promise.all(polls.map(async (poll, index): Promise<OwnerPoll> => {
    const withInsights = index < INSIGHT_POLLS;
    const ids = poll.candidates.map((c) => c.productId);
    const end = poll.status === "CLOSED" && poll.closedAt ? new Date(poll.closedAt) : new Date(Math.min(now, new Date(poll.endsAt).getTime()));
    const insights = withInsights ? await loadInsights(shopObjectId, ids, new Date(poll.startsAt), end) : null;
    const total = poll.candidates.reduce((sum, c) => sum + c.votes, 0);
    const winnerId = poll.winnerProductId?.toString() ?? null;
    const rows = poll.candidates.map((c): OwnerPollRow => {
      const id = c.productId.toString();
      const product = byId.get(id);
      return {
        productId: id,
        name: product?.name ?? "Deleted design",
        image: product?.images?.[0] ?? "",
        votes: c.votes,
        percentOfVotes: 0,
        views: insights?.views.get(id) ?? 0,
        saves: insights?.saves.get(id) ?? 0,
        whatsappClicks: insights?.taps.get(id) ?? 0,
        isWinner: id === winnerId,
      };
    });
    return {
      id: poll._id.toString(),
      title: poll.title,
      status: poll.status,
      startsAt: new Date(poll.startsAt).toISOString(),
      endsAt: new Date(poll.endsAt).toISOString(),
      closedAt: poll.closedAt ? new Date(poll.closedAt).toISOString() : null,
      endedEarly: Boolean(poll.endedEarly),
      totalVotes: total,
      winnerName: rows.find((r) => r.isWinner)?.name ?? null,
      rows,
      hasInsights: withInsights,
    };
  }));
}

/** Published, in-stock products the owner may put in a poll (newest first, capped). */
export async function loadPollableProducts(shopId: string) {
  await connectToDatabase();
  const products = await Product.find({ shopId: new Types.ObjectId(shopId), isPublished: true, stockStatus: "IN_STOCK" })
    .sort({ createdAt: -1, _id: -1 })
    .limit(200)
    .select("name images")
    .lean<{ _id: Types.ObjectId; name: string; images?: string[] }[]>();
  return products.map((p) => ({ id: p._id.toString(), name: p.name, image: p.images?.[0] ?? "" }));
}
