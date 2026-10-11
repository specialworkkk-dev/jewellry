"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Crown, Loader2 } from "lucide-react";
import { StoreImage } from "@/components/public/StoreImage";
import { STOREFRONT_THEMES } from "@/components/storefront/themes";
import type { StorefrontTemplateId } from "@/lib/storefront-template";
import { timeLeftLabel, votePercentages } from "@/lib/design-poll";
import type { StorefrontPoll } from "@/lib/design-poll-data";

type Results = { votes: { productId: string; votes: number }[] };

const GRID_BY_COUNT: Record<number, string> = {
  2: "grid-cols-2",
  3: "grid-cols-2 md:grid-cols-3",
  4: "grid-cols-2 md:grid-cols-4",
  5: "grid-cols-2 md:grid-cols-3",
  6: "grid-cols-2 md:grid-cols-3",
};

const MAX_TIMEOUT = 2_147_483_000;

export function DesignPollClient({
  poll,
  template,
  shopSlug,
  endsLabel,
  closedLabel,
}: {
  poll: StorefrontPoll;
  template: StorefrontTemplateId;
  shopSlug: string;
  endsLabel: string;
  closedLabel: string;
}) {
  const theme = STOREFRONT_THEMES[template];
  const router = useRouter();
  const isWinnerMode = poll.mode === "WINNER";
  const endMs = new Date(poll.endsAt).getTime();

  const [votedId, setVotedId] = useState<string | null>(poll.votedProductId);
  const [tally, setTally] = useState<Record<string, number>>(() => Object.fromEntries(poll.candidates.map((c) => [c.productId, c.votes])));
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  // Same value on the server and during hydration; replaced by the real clock right after mount.
  const [now, setNow] = useState(poll.serverNow);
  const [forcedEnd, setForcedEnd] = useState(false);
  const pendingRef = useRef(false);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const interval = setInterval(tick, 30_000);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, []);

  const ended = isWinnerMode || forcedEnd || now >= endMs;

  // When the countdown reaches zero, ask the server for the closed result (it closes the poll lazily).
  useEffect(() => {
    if (isWinnerMode) return;
    const wait = endMs - Date.now() + 1500;
    if (wait > MAX_TIMEOUT) return;
    const timer = setTimeout(() => router.refresh(), Math.max(wait, 1500));
    return () => clearTimeout(timer);
  }, [isWinnerMode, endMs, router]);

  const applyResults = useCallback((results: Results | undefined) => {
    if (!results || !Array.isArray(results.votes)) return;
    setTally((previous) => {
      const next = { ...previous };
      for (const row of results.votes) {
        if (typeof row.productId === "string" && Number.isFinite(row.votes)) next[row.productId] = row.votes;
      }
      return next;
    });
  }, []);

  // Voters see the bars move: refresh the tallies every 20s while the tab is visible and voting is open.
  useEffect(() => {
    if (!votedId || ended) return;
    const controller = new AbortController();
    const interval = setInterval(async () => {
      if (document.visibilityState !== "visible" || pendingRef.current) return;
      try {
        const res = await fetch(`/api/design-polls/${poll.pollId}/results`, { cache: "no-store", signal: controller.signal });
        if (!res.ok) return;
        const data: { results?: Results } | null = await res.json().catch(() => null);
        applyResults(data?.results);
      } catch {
        /* offline or aborted: keep the numbers we have */
      }
    }, 20_000);
    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [votedId, ended, poll.pollId, applyResults]);

  async function vote(productId: string) {
    if (pendingRef.current || votedId || ended) return;
    pendingRef.current = true;
    setPending(productId);
    setMessage(null);
    const before = tally;
    // Optimistic: show the bars immediately, roll back if the server says no.
    setVotedId(productId);
    setTally({ ...before, [productId]: (before[productId] ?? 0) + 1 });
    const rollback = (text: string) => {
      setVotedId(null);
      setTally(before);
      setMessage({ tone: "error", text });
    };
    try {
      const res = await fetch(`/api/design-polls/${poll.pollId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
        credentials: "same-origin",
      });
      const data: { results?: Results; votedProductId?: string; code?: string; error?: string } | null = await res.json().catch(() => null);
      if (res.ok) {
        applyResults(data?.results);
        setVotedId(data?.votedProductId ?? productId);
        setMessage({ tone: "ok", text: "Thank you! Your vote is counted." });
      } else if (res.status === 409 && data?.code === "ALREADY_VOTED") {
        applyResults(data.results);
        setVotedId(data.votedProductId ?? productId);
        setMessage({ tone: "ok", text: "You have already voted in this poll." });
      } else if (res.status === 409 && data?.code === "ENDED") {
        applyResults(data.results);
        setVotedId(null);
        setForcedEnd(true);
        setMessage({ tone: "error", text: "Voting has just ended. Showing the final result." });
        router.refresh();
      } else if (res.status === 429) {
        rollback("Too many votes from this connection. Please try again later.");
      } else {
        rollback(data?.error || "We could not record your vote. Please try again.");
      }
    } catch {
      rollback("No internet connection. Please check it and try again.");
    } finally {
      pendingRef.current = false;
      setPending(null);
    }
  }

  const showResults = isWinnerMode || votedId !== null || (ended && poll.showResults);
  const percents = useMemo(() => votePercentages(poll.candidates.map((c) => tally[c.productId] ?? 0)), [poll.candidates, tally]);
  const totalVotes = poll.candidates.reduce((sum, c) => sum + (tally[c.productId] ?? 0), 0);
  const winnerId = poll.winnerProductId;
  const grid = GRID_BY_COUNT[poll.candidates.length] ?? "grid-cols-2 md:grid-cols-3";

  const subtitle = isWinnerMode
    ? `Voting closed ${closedLabel}`
    : ended
      ? "Voting has ended"
      : `${timeLeftLabel(poll.endsAt, now)} · ${endsLabel}`;

  return (
    <section aria-label={poll.title} className={`${theme.pageBg} px-4 py-10`}>
      <div className="mx-auto max-w-6xl">
        <div className={`rounded-3xl p-4 shadow-sm sm:p-8 ${theme.detail.panel}`}>
          <div className="mb-5 flex flex-col gap-2 sm:mb-7 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${theme.detail.badge}`}>
                <Crown className="h-3.5 w-3.5" aria-hidden="true" />
                {isWinnerMode ? "This week's winner" : "Vote now"}
              </span>
              <h2 className={`mt-3 [overflow-wrap:anywhere] text-2xl leading-tight sm:text-3xl ${theme.detail.heading}`} style={{ fontFamily: theme.display }}>
                {poll.title}
              </h2>
              <p className={`mt-1 text-sm ${theme.detail.subtle}`}>
                {isWinnerMode
                  ? "Chosen by our customers' votes."
                  : votedId
                    ? "Thanks for voting! Live results below."
                    : "Pick your favourite design. One vote per person."}
              </p>
            </div>
            <div className={`shrink-0 text-sm sm:text-right ${theme.detail.subtle}`}>
              <p className={`font-semibold ${theme.detail.accent}`}>{subtitle}</p>
              {showResults && <p>{totalVotes} {totalVotes === 1 ? "vote" : "votes"}</p>}
            </div>
          </div>

          <ul className={`grid gap-3 sm:gap-5 ${grid} ${poll.candidates.length === 2 ? "mx-auto max-w-2xl" : ""}`}>
            {poll.candidates.map((candidate, index) => {
              const isWinner = isWinnerMode && candidate.productId === winnerId;
              const isMine = votedId === candidate.productId;
              const votes = tally[candidate.productId] ?? 0;
              const percent = percents[index] ?? 0;
              const href = `/shop/${shopSlug}/product/${candidate.productId}`;
              return (
                <li
                  key={candidate.productId}
                  className={`flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-white shadow-sm ${isWinner ? "border-amber-500 ring-2 ring-amber-400" : isMine ? "border-neutral-900/40 ring-1 ring-neutral-900/20" : "border-black/10"}`}
                >
                  <Link href={href} className="relative block aspect-square bg-black/5" aria-label={`View ${candidate.name}`}>
                    <StoreImage
                      src={candidate.image}
                      alt={candidate.name}
                      thumb
                      sizes="(min-width: 1024px) 25vw, (min-width: 768px) 30vw, 50vw"
                      className="h-full w-full object-cover"
                    />
                    {isWinner && (
                      <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-1 text-xs font-bold text-black shadow">
                        <Crown className="h-3.5 w-3.5" aria-hidden="true" /> Winner
                      </span>
                    )}
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col gap-3 p-3 sm:p-4">
                    <Link href={href} className="min-w-0 text-neutral-950 hover:underline">
                      <h3 className="line-clamp-2 [overflow-wrap:anywhere] text-sm font-semibold leading-snug sm:text-base">{candidate.name}</h3>
                    </Link>
                    <div className="mt-auto">
                      {showResults ? (
                        <div>
                          <div className="mb-1 flex items-baseline justify-between gap-2 text-xs text-neutral-700">
                            <span className="text-base font-bold tabular-nums text-neutral-950">{percent}%</span>
                            <span className="truncate tabular-nums">{votes} {votes === 1 ? "vote" : "votes"}</span>
                          </div>
                          <div
                            className="h-2.5 overflow-hidden rounded-full bg-black/10"
                            role="progressbar"
                            aria-label={`${candidate.name} share of votes`}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={percent}
                          >
                            <div
                              className={`h-full rounded-full transition-[width] duration-700 ${isWinner || isMine ? "bg-gradient-to-r from-amber-400 to-amber-600" : "bg-neutral-400"}`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          {isMine && (
                            <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-neutral-900">
                              <Check className="h-3.5 w-3.5" aria-hidden="true" /> Your vote
                            </p>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => vote(candidate.productId)}
                          disabled={pending !== null || ended}
                          className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${theme.detail.primaryButton}`}
                        >
                          {pending === candidate.productId ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                          {ended ? "Voting ended" : "Vote"}
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <p
            role="status"
            aria-live="polite"
            className={`mt-4 min-h-5 text-center text-sm font-medium ${message?.tone === "error" ? "text-red-700" : "text-neutral-800"}`}
          >
            {message?.text ?? ""}
          </p>
        </div>
      </div>
    </section>
  );
}
