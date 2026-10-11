import Link from "next/link";
import { Crown, Eye, Heart, MessageCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StoreImage } from "@/components/public/StoreImage";
import { requireOwnerTenant } from "@/lib/tenant";
import { getPlanBlock } from "@/lib/plan";
import { formatIst, insightHint, pollPhase, timeLeftLabel, votePercentages, FEATURE_DAYS } from "@/lib/design-poll";
import { loadOwnerPolls, loadPollableProducts, type OwnerPoll } from "@/lib/design-poll-data";
import { PollForm } from "./poll-form";
import { EndPollButton } from "./end-poll-button";

export const dynamic = "force-dynamic";

const currentTimeMs = () => Date.now();

function PollResults({ poll, shopSlug }: { poll: OwnerPoll; shopSlug: string }) {
  const percents = votePercentages(poll.rows.map((row) => row.votes));
  return (
    <ul className="space-y-3">
      {poll.rows.map((row, index) => (
        <li key={row.productId} className={`rounded-lg border p-3 ${row.isWinner ? "border-amber-400 bg-amber-50/60" : "border-gray-200"}`}>
          <div className="flex min-w-0 gap-3">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-gray-100">
              <StoreImage src={row.image} alt="" thumb sizes="64px" className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <Link href={`/shop/${shopSlug}/product/${row.productId}`} target="_blank" className="min-w-0 [overflow-wrap:anywhere] text-sm font-semibold text-gray-900 hover:underline">
                  {row.name}
                </Link>
                {row.isWinner && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-black">
                    <Crown className="h-3 w-3" aria-hidden="true" /> Winner
                  </span>
                )}
              </div>
              <div className="mt-1 flex items-baseline justify-between gap-2 text-xs text-gray-600">
                <span className="text-base font-bold tabular-nums text-gray-900">{percents[index]}%</span>
                <span className="tabular-nums">{row.votes} {row.votes === 1 ? "vote" : "votes"}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100" role="progressbar" aria-label={`${row.name} share of votes`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percents[index]}>
                <div className={`h-full rounded-full ${row.isWinner ? "bg-amber-500" : "bg-gray-400"}`} style={{ width: `${percents[index]}%` }} />
              </div>
            </div>
          </div>
          {poll.hasInsights && (
            <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-xs text-gray-600">
              <div className="rounded-md bg-gray-50 px-1 py-2">
                <dt className="flex items-center justify-center gap-1"><Eye className="h-3.5 w-3.5" aria-hidden="true" /> Views</dt>
                <dd className="mt-0.5 text-sm font-semibold tabular-nums text-gray-900">{row.views}</dd>
              </div>
              <div className="rounded-md bg-gray-50 px-1 py-2">
                <dt className="flex items-center justify-center gap-1"><Heart className="h-3.5 w-3.5" aria-hidden="true" /> Saves</dt>
                <dd className="mt-0.5 text-sm font-semibold tabular-nums text-gray-900">{row.saves}</dd>
              </div>
              <div className="rounded-md bg-gray-50 px-1 py-2">
                <dt className="flex items-center justify-center gap-1"><MessageCircle className="h-3.5 w-3.5" aria-hidden="true" /> WhatsApp</dt>
                <dd className="mt-0.5 text-sm font-semibold tabular-nums text-gray-900">{row.whatsappClicks}</dd>
              </div>
            </dl>
          )}
        </li>
      ))}
    </ul>
  );
}

export default async function DesignPollPage() {
  const { shop, shopId } = await requireOwnerTenant();
  const shopRef = { shopId, slug: shop.slug };
  const [polls, products] = await Promise.all([loadOwnerPolls(shopRef), loadPollableProducts(shopId)]);
  const now = currentTimeMs();
  const active = polls.find((poll) => poll.status === "ACTIVE" && pollPhase(poll, now) === "ACTIVE");
  const past = polls.filter((poll) => poll !== active);
  const latestWithVotes = active ?? past[0];
  const planBlock = getPlanBlock(shop);

  return (
    <div className="max-w-5xl space-y-6">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Design of the Week</h1>
        <p className="mt-2 text-gray-500">
          Let customers vote on your designs. The winner gets a &quot;Design of the Week&quot; tag for {FEATURE_DAYS} days, and the results show you what to stock more of.
        </p>
      </div>

      {active ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg sm:text-xl">{active.title}</CardTitle>
            <p className="text-sm text-gray-500">
              Running now · {timeLeftLabel(active.endsAt, now)} · ends {formatIst(active.endsAt)} · {active.totalVotes} {active.totalVotes === 1 ? "vote" : "votes"}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <PollResults poll={active} shopSlug={shop.slug} />
            <EndPollButton pollId={active.id} />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg sm:text-xl">Start a new poll</CardTitle>
          </CardHeader>
          <CardContent>
            <PollForm products={products} blockedReason={planBlock?.error} />
          </CardContent>
        </Card>
      )}

      {latestWithVotes && latestWithVotes.hasInsights && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4 sm:p-5">
            <p className="text-sm font-semibold text-gray-900">What this tells you</p>
            <p className="mt-1 text-sm text-gray-700">{insightHint(latestWithVotes.rows)}</p>
            <p className="mt-2 text-xs text-gray-500">Views, saves and WhatsApp taps are counted only while the poll was running.</p>
          </CardContent>
        </Card>
      )}

      {past.length > 0 && (
        <section aria-label="Past polls" className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Past polls</h2>
          {past.map((poll) => (
            <Card key={poll.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">{poll.title}</CardTitle>
                <p className="text-sm text-gray-500">
                  {formatIst(poll.startsAt)} to {formatIst(poll.closedAt ?? poll.endsAt)}
                  {poll.endedEarly ? " (ended early)" : ""} · {poll.totalVotes} {poll.totalVotes === 1 ? "vote" : "votes"}
                </p>
                <p className="text-sm font-medium text-gray-800">
                  {poll.winnerName ? <>Winner: <span className="text-amber-700">{poll.winnerName}</span></> : "No votes, so no winner"}
                </p>
              </CardHeader>
              <CardContent>
                <PollResults poll={poll} shopSlug={shop.slug} />
              </CardContent>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}
