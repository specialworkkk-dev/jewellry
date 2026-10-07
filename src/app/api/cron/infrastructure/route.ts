import { NextRequest, NextResponse } from "next/server";
import { collectAndStoreInfrastructureReport } from "@/lib/infrastructure-monitor";
import { drainPendingNotificationJobs } from "@/lib/push-notifications";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [report, notificationQueue] = await Promise.all([
      collectAndStoreInfrastructureReport("cron"),
      drainPendingNotificationJobs(10),
    ]);
    return NextResponse.json({
      ok: true,
      checkedAt: report.checkedAt,
      alertCount: report.alerts.length,
      criticalCount: report.alerts.filter((alert) => alert.severity === "critical").length,
      notificationJobsProcessed: notificationQueue.processed,
    });
  } catch (error: unknown) {
    console.error("Infrastructure cron failed", error);
    return NextResponse.json({ error: "Infrastructure check failed" }, { status: 500 });
  }
}
