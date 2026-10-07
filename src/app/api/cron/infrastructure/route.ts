import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { collectAndStoreInfrastructureReport } from "@/lib/infrastructure-monitor";
import { drainPendingNotificationJobs } from "@/lib/push-notifications";

export const dynamic = "force-dynamic";

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !safeEqual(request.headers.get("authorization") ?? "", `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [reportResult, queueResult] = await Promise.allSettled([
    collectAndStoreInfrastructureReport("cron"),
    drainPendingNotificationJobs(10),
  ]);

  if (reportResult.status === "rejected") console.error("Infrastructure report failed", reportResult.reason);
  if (queueResult.status === "rejected") console.error("Notification queue drain failed", queueResult.reason);

  const report = reportResult.status === "fulfilled" ? reportResult.value : null;
  const queue = queueResult.status === "fulfilled" ? queueResult.value : null;
  const ok = Boolean(report && queue);

  return NextResponse.json(
    {
      ok,
      infrastructure: report
        ? {
            ok: true,
            checkedAt: report.checkedAt,
            alertCount: report.alerts.length,
            criticalCount: report.alerts.filter((alert) => alert.severity === "critical").length,
          }
        : { ok: false, error: "Infrastructure check failed" },
      notifications: queue
        ? { ok: true, processed: queue.processed }
        : { ok: false, error: "Notification queue drain failed" },
      // Backwards-compatible flat fields.
      checkedAt: report?.checkedAt ?? null,
      alertCount: report?.alerts.length ?? null,
      notificationJobsProcessed: queue?.processed ?? null,
    },
    { status: ok ? 200 : 500 },
  );
}
