import "server-only";

import { Rest } from "ably";
import { after } from "next/server";
import { withRetry } from "@/lib/retry";

export type ShopRealtimeEventType =
  | "product.created"
  | "product.updated"
  | "product.deleted"
  | "shop.settings.updated"
  | "shop.gold-rate.updated"
  | "shop.status.updated"
  | "enquiry.created"
  | "interaction.updated";

export type ShopRealtimeAudience = "public" | "owner" | "both";

export interface ShopRealtimeEvent {
  id: string;
  type: ShopRealtimeEventType;
  shopId: string;
  occurredAt: string;
  entityId?: string;
}

const globalRealtime = globalThis as typeof globalThis & {
  ablyRest?: Rest;
};

export function shopRealtimeChannel(shopId: string, audience: Exclude<ShopRealtimeAudience, "both">) {
  return `shop:${shopId}:${audience}`;
}

export function getAblyRestClient() {
  const key = process.env.ABLY_API_KEY?.trim();
  if (!key) return null;
  if (!globalRealtime.ablyRest) {
    globalRealtime.ablyRest = new Rest({ key });
  }
  return globalRealtime.ablyRest;
}

async function publishShopEvent(
  shopId: string,
  type: ShopRealtimeEventType,
  audience: ShopRealtimeAudience,
  entityId?: string,
) {
  const client = getAblyRestClient();
  if (!client) return;

  const event: ShopRealtimeEvent = {
    id: crypto.randomUUID(),
    type,
    shopId,
    occurredAt: new Date().toISOString(),
    ...(entityId ? { entityId } : {}),
  };
  const targets = audience === "both" ? ["public", "owner"] as const : [audience];

  try {
    await Promise.all(
      targets.map((target) => withRetry(
        () => client.channels.get(shopRealtimeChannel(shopId, target)).publish("shop-update", event),
        { attempts: 3, baseDelayMs: 100, maxDelayMs: 750 },
      )),
    );
  } catch (error) {
    // Realtime delivery must never roll back a successful business mutation.
    console.error("Realtime publish failed", error);
  }
}

export function scheduleShopEvent(
  shopId: string,
  type: ShopRealtimeEventType,
  audience: ShopRealtimeAudience,
  entityId?: string,
) {
  if (!process.env.ABLY_API_KEY?.trim()) return;
  after(() => publishShopEvent(shopId, type, audience, entityId));
}
