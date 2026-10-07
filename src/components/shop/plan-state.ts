import { getPlanReminderStatus } from "@/lib/plan";

/** True when a paid plan's end date is in the past. Free shops never expire. */
export function isPlanExpired(shop: { planEndsAt?: Date | string | null; planPrice?: number | null }) {
  if (!shop.planEndsAt || Number(shop.planPrice ?? 0) <= 0) return false;
  return getPlanReminderStatus(new Date(shop.planEndsAt)).expired;
}
