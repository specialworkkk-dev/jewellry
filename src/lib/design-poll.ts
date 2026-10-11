/**
 * "Design of the Week" poll: pure rules shared by the API, the storefront and the owner page.
 * No framework or "@/" imports so node tests can load this file directly.
 */

export const POLL_MIN_CANDIDATES = 2;
export const POLL_MAX_CANDIDATES = 6;
export const POLL_MIN_DAYS = 3;
export const POLL_MAX_DAYS = 14;
export const POLL_DEFAULT_DAYS = 7;
export const POLL_TITLE_MAX = 80;
export const POLL_DEFAULT_TITLE = "Design of the Week";
/** A winner stays featured on the storefront for this long after the poll closes. */
export const FEATURE_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
const OBJECT_ID = /^[0-9a-f]{24}$/i;

export type PollInputResult =
  | { ok: true; title: string; productIds: string[]; durationDays: number }
  | { ok: false; error: string };

/** Validates owner input. Product ids keep the order the owner chose (it is the tie-break order). */
export function validatePollInput(input: { title?: unknown; productIds?: unknown; durationDays?: unknown }): PollInputResult {
  let title = POLL_DEFAULT_TITLE;
  if (input.title !== undefined && input.title !== null && input.title !== "") {
    if (typeof input.title !== "string") return { ok: false, error: "Title must be text" };
    const cleaned = input.title.replace(/\s+/g, " ").trim();
    if (cleaned.length > POLL_TITLE_MAX) return { ok: false, error: `Title can be at most ${POLL_TITLE_MAX} characters` };
    if (cleaned) title = cleaned;
  }

  let durationDays = POLL_DEFAULT_DAYS;
  if (input.durationDays !== undefined && input.durationDays !== null && input.durationDays !== "") {
    const raw = typeof input.durationDays === "string" ? input.durationDays.trim() : input.durationDays;
    const parsed = typeof raw === "string" ? (/^\d{1,3}$/.test(raw) ? Number(raw) : Number.NaN) : raw;
    if (typeof parsed !== "number" || !Number.isInteger(parsed) || parsed < POLL_MIN_DAYS || parsed > POLL_MAX_DAYS) {
      return { ok: false, error: `Duration must be a whole number of days from ${POLL_MIN_DAYS} to ${POLL_MAX_DAYS}` };
    }
    durationDays = parsed;
  }

  if (!Array.isArray(input.productIds)) return { ok: false, error: "Choose the designs to compare" };
  if (input.productIds.length > POLL_MAX_CANDIDATES * 4) return { ok: false, error: `Choose ${POLL_MIN_CANDIDATES} to ${POLL_MAX_CANDIDATES} designs` };
  const productIds: string[] = [];
  for (const id of input.productIds) {
    if (typeof id !== "string" || !OBJECT_ID.test(id)) return { ok: false, error: "One of the chosen designs is invalid" };
    const normalized = id.toLowerCase();
    if (productIds.includes(normalized)) return { ok: false, error: "Each design can only be chosen once" };
    productIds.push(normalized);
  }
  if (productIds.length < POLL_MIN_CANDIDATES || productIds.length > POLL_MAX_CANDIDATES) {
    return { ok: false, error: `Choose ${POLL_MIN_CANDIDATES} to ${POLL_MAX_CANDIDATES} designs` };
  }
  return { ok: true, title, productIds, durationDays };
}

/** Exact end instant: the poll starts at `now` and runs for `durationDays` full days. */
export function computeEndsAt(now: number, durationDays: number) {
  return new Date(now + durationDays * DAY_MS);
}

export interface Candidate {
  productId: string;
  votes: number;
}

/**
 * Winner = most votes; a tie goes to the design the owner listed first; nobody wins with zero votes.
 * `candidates` must be in the owner's chosen order.
 */
export function resolveWinner(candidates: readonly Candidate[]): string | null {
  let best: Candidate | null = null;
  for (const candidate of candidates) {
    const votes = Number.isFinite(candidate.votes) ? candidate.votes : 0;
    if (votes <= 0) continue;
    if (!best || votes > best.votes) best = { productId: candidate.productId, votes };
  }
  return best ? best.productId : null;
}

/**
 * Whole-number percentages that add up to exactly 100 (largest-remainder method) when anyone voted,
 * and all zeros when nobody did. Ties in the remainder favour the earlier entry.
 */
export function votePercentages(votes: readonly number[]): number[] {
  const clean = votes.map((v) => (Number.isFinite(v) && v > 0 ? Math.floor(v) : 0));
  const total = clean.reduce((sum, v) => sum + v, 0);
  if (total === 0) return clean.map(() => 0);
  const exact = clean.map((v) => (v * 100) / total);
  const result = exact.map((value) => Math.floor(value));
  let remaining = 100 - result.reduce((sum, v) => sum + v, 0);
  const order = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (let i = 0; remaining > 0 && i < order.length; i += 1, remaining -= 1) {
    result[order[i].index] += 1;
  }
  return result;
}

export type PollPhase = "ACTIVE" | "AWAITING_CLOSE" | "CLOSED";

/** ACTIVE = voting open; AWAITING_CLOSE = past its end but not yet closed in the database. */
export function pollPhase(poll: { status: string; endsAt: Date | string | number }, now: number): PollPhase {
  if (poll.status !== "ACTIVE") return "CLOSED";
  const end = new Date(poll.endsAt).getTime();
  return Number.isFinite(end) && end > now ? "ACTIVE" : "AWAITING_CLOSE";
}

/** "Ends in 3d 4h", "Ends in 5h 12m", "Ends in 12m", "Ending soon", "Ended". */
export function timeLeftLabel(endsAt: Date | string | number, now: number) {
  const end = new Date(endsAt).getTime();
  if (!Number.isFinite(end)) return "Ended";
  const left = end - now;
  if (left <= 0) return "Ended";
  if (left < MINUTE_MS) return "Ending soon";
  const days = Math.floor(left / DAY_MS);
  const hours = Math.floor((left % DAY_MS) / HOUR_MS);
  const minutes = Math.floor((left % HOUR_MS) / MINUTE_MS);
  if (days > 0) return `Ends in ${days}d ${hours}h`;
  if (hours > 0) return `Ends in ${hours}h ${minutes}m`;
  return `Ends in ${minutes}m`;
}

/** The instant the winner stops being featured. */
export function featuredUntil(closedAt: Date | string | number) {
  return new Date(new Date(closedAt).getTime() + FEATURE_DAYS * DAY_MS);
}

/** True while a closed poll's winner is still inside the 7-day featuring window. */
export function isFeaturedNow(closedAt: Date | string | number | null | undefined, now: number) {
  if (closedAt === null || closedAt === undefined) return false;
  const closed = new Date(closedAt).getTime();
  if (!Number.isFinite(closed)) return false;
  return now >= closed && now < closed + FEATURE_DAYS * DAY_MS;
}

/** What the storefront should do with a poll right now. */
export function storefrontVisibility(
  poll: { status: string; endsAt: Date | string | number; closedAt?: Date | string | null; winnerProductId?: string | null },
  now: number,
): "VOTING" | "WINNER" | "HIDDEN" {
  const phase = pollPhase(poll, now);
  if (phase === "ACTIVE") return "VOTING";
  // Past its end but not closed yet: the next read closes it; until then it is not shown as a result.
  if (phase === "AWAITING_CLOSE") return "HIDDEN";
  return poll.winnerProductId && isFeaturedNow(poll.closedAt, now) ? "WINNER" : "HIDDEN";
}

/** Date and time in Indian Standard Time, e.g. "12 Oct, 6:30 pm IST". */
export function formatIst(value: Date | string | number) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const text = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
  return `${text.replace(/\b(am|pm)\b/i, (m) => m.toLowerCase())} IST`;
}

export interface InsightRow {
  productId: string;
  name: string;
  votes: number;
  views: number;
  saves: number;
  whatsappClicks: number;
}

/** One short plain-language takeaway for the owner. */
export function insightHint(rows: readonly InsightRow[]): string {
  const totalVotes = rows.reduce((sum, r) => sum + r.votes, 0);
  if (rows.length === 0 || totalVotes === 0) {
    return "No votes yet. Share your shop link or WhatsApp status so customers can vote.";
  }
  const top = (pick: (r: InsightRow) => number) => {
    let best: InsightRow | null = null;
    for (const row of rows) if (pick(row) > 0 && (!best || pick(row) > pick(best))) best = row;
    return best;
  };
  const voted = top((r) => r.votes);
  const asked = top((r) => r.whatsappClicks);
  if (!voted) return "No votes yet.";
  if (asked && asked.productId !== voted.productId) {
    return `"${voted.name}" is the customers' favourite, but "${asked.name}" got more WhatsApp enquiries. Likes are not always buying intent: show both prominently.`;
  }
  if (asked) {
    return `"${voted.name}" leads the votes and also drives the most WhatsApp enquiries. It is a safe design to stock more of and feature in your offers.`;
  }
  return `"${voted.name}" leads the votes. No WhatsApp enquiries from these designs yet, so consider a post or offer on the favourite.`;
}
