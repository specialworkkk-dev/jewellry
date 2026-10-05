import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import connectToDatabase from "@/lib/mongoose";
import { r2Client } from "@/lib/r2";
import InfrastructureSnapshot from "@/models/InfrastructureSnapshot";

export type InfrastructureStatus = "healthy" | "warning" | "critical" | "unconfigured" | "error";
export type AlertSeverity = "info" | "warning" | "critical";

export interface InfrastructureMetric {
  label: string;
  value: number;
  unit: "bytes" | "count" | "percent" | "inr" | "usd";
  limit?: number;
  percent?: number;
}

export interface InfrastructureServiceReport {
  key: "mongodb" | "r2" | "vercel";
  name: string;
  status: InfrastructureStatus;
  configured: boolean;
  summary: string;
  recommendation: string;
  metrics: InfrastructureMetric[];
  projectedMonthlyCostInr: number;
  details: Array<{ label: string; value: string }>;
}

export interface InfrastructureAlert {
  service: "mongodb" | "r2" | "vercel" | "system";
  severity: AlertSeverity;
  title: string;
  message: string;
  action: string;
}

export interface InfrastructureReport {
  checkedAt: string;
  billingPeriodStart: string;
  budgetInr: number;
  usdToInrRate: number;
  services: {
    mongodb: InfrastructureServiceReport;
    r2: InfrastructureServiceReport;
    vercel: InfrastructureServiceReport;
  };
  alerts: InfrastructureAlert[];
  projectedMonthlyCostInr: number;
}

const R2_CLASS_A_ACTIONS = new Set([
  "listbuckets", "putbucket", "listobjects", "putobject", "copyobject",
  "completemultipartupload", "createmultipartupload", "listmultipartuploads",
  "uploadpart", "uploadpartcopy", "listparts", "putbucketcors",
  "putbucketencryption", "putbucketlifecycleconfiguration",
]);

const R2_CLASS_B_ACTIONS = new Set([
  "headbucket", "headobject", "getobject", "getbucketlocation", "getbucketcors",
  "getbucketencryption", "getbucketlifecycleconfiguration",
]);

const numberFromEnv = (name: string, fallback: number) => {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const percentage = (value: number, limit: number) => limit > 0 ? (value / limit) * 100 : 0;
const rounded = (value: number, digits = 2) => Number(value.toFixed(digits));

function thresholdStatus(value: number): InfrastructureStatus {
  if (value >= 100) return "critical";
  if (value >= 70) return "warning";
  return "healthy";
}

function thresholdAlert(
  service: InfrastructureAlert["service"],
  label: string,
  percent: number,
  action: string,
): InfrastructureAlert | null {
  if (percent < 70) return null;
  if (percent >= 100) {
    return {
      service,
      severity: "critical",
      title: `${label} free allowance exhausted`,
      message: `${label} is at ${rounded(percent, 1)}% of the configured allowance. Paid usage, throttling, or service interruption may occur.`,
      action,
    };
  }
  if (percent >= 85) {
    return {
      service,
      severity: "critical",
      title: `${label} requires an upgrade decision`,
      message: `${label} has reached ${rounded(percent, 1)}%. Prepare billing or reduce usage before it reaches 100%.`,
      action,
    };
  }
  return {
    service,
    severity: "warning",
    title: `${label} is approaching its allowance`,
    message: `${label} has reached ${rounded(percent, 1)}%.`,
    action,
  };
}

async function collectMongoDb(): Promise<{ service: InfrastructureServiceReport; alerts: InfrastructureAlert[] }> {
  const storageLimitBytes = numberFromEnv("MONGODB_STORAGE_LIMIT_MB", 512) * 1024 * 1024;

  try {
    const connection = await connectToDatabase();
    const db = connection.connection.db;
    if (!db) throw new Error("MongoDB database is unavailable");

    const stats = await db.command({ dbStats: 1, scale: 1 });
    const dataBytes = Number(stats.dataSize || 0);
    const indexBytes = Number(stats.indexSize || 0);
    const allocatedBytes = Number(stats.totalSize || stats.storageSize || 0);
    const billableBytes = dataBytes + indexBytes;
    const usedPercent = percentage(billableBytes, storageLimitBytes);
    const alert = thresholdAlert(
      "mongodb",
      "MongoDB storage",
      usedPercent,
      "Upgrade Atlas to Flex or remove/archive old analytics and enquiries.",
    );

    return {
      service: {
        key: "mongodb",
        name: "MongoDB Atlas",
        status: thresholdStatus(usedPercent),
        configured: true,
        summary: `${rounded(usedPercent, 2)}% of the configured storage allowance is used.`,
        recommendation: usedPercent >= 85
          ? "Prepare an Atlas Flex upgrade before writes reach the hard storage limit."
          : "Free storage is currently sufficient; retain daily monitoring.",
        metrics: [
          { label: "Billable data + indexes", value: billableBytes, limit: storageLimitBytes, percent: usedPercent, unit: "bytes" },
          { label: "Document data", value: dataBytes, unit: "bytes" },
          { label: "Indexes", value: indexBytes, unit: "bytes" },
          { label: "Allocated storage", value: allocatedBytes, unit: "bytes" },
          { label: "Documents", value: Number(stats.objects || 0), unit: "count" },
          { label: "Collections", value: Number(stats.collections || 0), unit: "count" },
        ],
        projectedMonthlyCostInr: usedPercent >= 85
          ? rounded(8 * numberFromEnv("USD_TO_INR_RATE", 88))
          : 0,
        details: [
          { label: "Configured tier capacity", value: `${numberFromEnv("MONGODB_STORAGE_LIMIT_MB", 512)} MB` },
          { label: "Upgrade estimate", value: "Atlas Flex starts near US$8/month" },
        ],
      },
      alerts: alert ? [alert] : [],
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "MongoDB check failed";
    return {
      service: {
        key: "mongodb",
        name: "MongoDB Atlas",
        status: "error",
        configured: Boolean(process.env.MONGODB_URI),
        summary: "Unable to read database capacity.",
        recommendation: "Check MONGODB_URI, Atlas network access, and cluster availability.",
        metrics: [],
        projectedMonthlyCostInr: 0,
        details: [{ label: "Error", value: message }],
      },
      alerts: [{
        service: "mongodb",
        severity: "critical",
        title: "MongoDB monitoring failed",
        message,
        action: "Verify Atlas connectivity immediately.",
      }],
    };
  }
}

interface R2OperationTotals {
  classA: number;
  classB: number;
  other: number;
}

async function collectR2Operations(startDate: Date, endDate: Date): Promise<R2OperationTotals | null> {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const accountId = process.env.R2_ACCOUNT_ID;
  const bucketName = process.env.R2_BUCKET_NAME;
  if (!apiToken || !accountId || !bucketName) return null;

  const query = `query R2Operations($accountTag: string!, $startDate: Time, $endDate: Time, $bucketName: string) {
    viewer {
      accounts(filter: { accountTag: $accountTag }) {
        r2OperationsAdaptiveGroups(limit: 10000, filter: {
          datetime_geq: $startDate,
          datetime_leq: $endDate,
          bucketName: $bucketName
        }) {
          sum { requests }
          dimensions { actionType }
        }
      }
    }
  }`;

  const response = await fetch("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      variables: {
        accountTag: accountId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        bucketName,
      },
    }),
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`Cloudflare analytics returned HTTP ${response.status}`);
  const payload = await response.json() as {
    errors?: Array<{ message?: string }>;
    data?: { viewer?: { accounts?: Array<{ r2OperationsAdaptiveGroups?: Array<{ sum?: { requests?: number }; dimensions?: { actionType?: string } }> }> } };
  };
  if (payload.errors?.length) throw new Error(payload.errors[0]?.message || "Cloudflare analytics query failed");

  const groups = payload.data?.viewer?.accounts?.[0]?.r2OperationsAdaptiveGroups || [];
  return groups.reduce<R2OperationTotals>((totals, group) => {
    const action = (group.dimensions?.actionType || "").toLowerCase();
    const requests = Number(group.sum?.requests || 0);
    if (R2_CLASS_A_ACTIONS.has(action)) totals.classA += requests;
    else if (R2_CLASS_B_ACTIONS.has(action)) totals.classB += requests;
    else totals.other += requests;
    return totals;
  }, { classA: 0, classB: 0, other: 0 });
}

async function collectR2(now: Date, periodStart: Date): Promise<{ service: InfrastructureServiceReport; alerts: InfrastructureAlert[] }> {
  const bucket = process.env.R2_BUCKET_NAME;
  const configured = Boolean(bucket && process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY);
  const storageLimit = numberFromEnv("R2_FREE_STORAGE_GB", 10) * 1_000_000_000;
  const classALimit = numberFromEnv("R2_FREE_CLASS_A_OPERATIONS", 1_000_000);
  const classBLimit = numberFromEnv("R2_FREE_CLASS_B_OPERATIONS", 10_000_000);
  const usdToInr = numberFromEnv("USD_TO_INR_RATE", 88);

  if (!configured || !bucket) {
    return {
      service: {
        key: "r2",
        name: "Cloudflare R2",
        status: "unconfigured",
        configured: false,
        summary: "R2 credentials are incomplete.",
        recommendation: "Configure the R2 account, bucket and S3 credentials.",
        metrics: [],
        projectedMonthlyCostInr: 0,
        details: [],
      },
      alerts: [{
        service: "r2",
        severity: "critical",
        title: "R2 monitoring is not configured",
        message: "The monitor cannot verify media storage availability.",
        action: "Configure R2_ACCOUNT_ID, R2_BUCKET_NAME and R2 access keys.",
      }],
    };
  }

  try {
    let continuationToken: string | undefined;
    let objectCount = 0;
    let storageBytes = 0;
    do {
      const result = await r2Client.send(new ListObjectsV2Command({
        Bucket: bucket,
        ContinuationToken: continuationToken,
      }));
      for (const object of result.Contents || []) {
        objectCount += 1;
        storageBytes += Number(object.Size || 0);
      }
      continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
    } while (continuationToken);

    const storagePercent = percentage(storageBytes, storageLimit);
    const alerts: InfrastructureAlert[] = [];
    const storageAlert = thresholdAlert(
      "r2",
      "R2 storage",
      storagePercent,
      "Enable R2 billing or remove unused media before exceeding 10 GB-month.",
    );
    if (storageAlert) alerts.push(storageAlert);

    let operations: R2OperationTotals | null = null;
    let operationError = "";
    try {
      operations = await collectR2Operations(periodStart, now);
    } catch (error: unknown) {
      operationError = error instanceof Error ? error.message : "Cloudflare analytics check failed";
    }

    const elapsed = Math.max(1, now.getTime() - periodStart.getTime());
    const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const periodDuration = nextMonth.getTime() - periodStart.getTime();
    const projectionFactor = Math.max(1, periodDuration / elapsed);
    const projectedClassA = operations ? operations.classA * projectionFactor : 0;
    const projectedClassB = operations ? operations.classB * projectionFactor : 0;
    const classAPercent = operations ? percentage(projectedClassA, classALimit) : 0;
    const classBPercent = operations ? percentage(projectedClassB, classBLimit) : 0;

    if (operations) {
      const classAAlert = thresholdAlert("r2", "Projected R2 Class A operations", classAPercent, "Review upload/list traffic or enable paid R2 usage.");
      const classBAlert = thresholdAlert("r2", "Projected R2 Class B operations", classBPercent, "Enable a cached R2 custom domain or paid R2 usage.");
      if (classAAlert) alerts.push(classAAlert);
      if (classBAlert) alerts.push(classBAlert);
    } else {
      alerts.push({
        service: "r2",
        severity: "warning",
        title: "R2 request-cost tracking is incomplete",
        message: operationError || "Storage is monitored, but monthly Class A/Class B requests are unavailable.",
        action: "Add a CLOUDFLARE_API_TOKEN with Analytics Read permission.",
      });
    }

    const storageOverageGb = Math.max(0, storageBytes - storageLimit) / 1_000_000_000;
    const classAOverageMillions = Math.max(0, projectedClassA - classALimit) / 1_000_000;
    const classBOverageMillions = Math.max(0, projectedClassB - classBLimit) / 1_000_000;
    const projectedUsd = storageOverageGb * 0.015 + classAOverageMillions * 4.5 + classBOverageMillions * 0.36;
    const worstPercent = Math.max(storagePercent, classAPercent, classBPercent);

    const metrics: InfrastructureMetric[] = [
      { label: "Stored media", value: storageBytes, limit: storageLimit, percent: storagePercent, unit: "bytes" },
      { label: "Objects", value: objectCount, unit: "count" },
    ];
    if (operations) {
      metrics.push(
        { label: "Class A this month", value: operations.classA, limit: classALimit, percent: percentage(operations.classA, classALimit), unit: "count" },
        { label: "Class B this month", value: operations.classB, limit: classBLimit, percent: percentage(operations.classB, classBLimit), unit: "count" },
        { label: "Projected Class A", value: projectedClassA, limit: classALimit, percent: classAPercent, unit: "count" },
        { label: "Projected Class B", value: projectedClassB, limit: classBLimit, percent: classBPercent, unit: "count" },
      );
    }

    return {
      service: {
        key: "r2",
        name: "Cloudflare R2",
        status: operations ? thresholdStatus(worstPercent) : (storagePercent >= 70 ? thresholdStatus(storagePercent) : "warning"),
        configured: true,
        summary: operations
          ? `${rounded(storagePercent, 2)}% storage used; request usage is tracked for this month.`
          : `${rounded(storagePercent, 2)}% storage used; request analytics needs an API token.`,
        recommendation: worstPercent >= 85
          ? "Prepare paid R2 usage and verify CDN caching now."
          : "Storage is within allowance; connect analytics to prevent request-cost surprises.",
        metrics,
        projectedMonthlyCostInr: rounded(projectedUsd * usdToInr),
        details: [
          { label: "Bucket", value: bucket },
          { label: "Analytics", value: operations ? "Connected" : "Needs CLOUDFLARE_API_TOKEN" },
          { label: "Internet egress", value: "Free on R2" },
        ],
      },
      alerts,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "R2 check failed";
    return {
      service: {
        key: "r2",
        name: "Cloudflare R2",
        status: "error",
        configured: true,
        summary: "Unable to read bucket usage.",
        recommendation: "Verify R2 credentials and bucket access.",
        metrics: [],
        projectedMonthlyCostInr: 0,
        details: [{ label: "Error", value: message }],
      },
      alerts: [{ service: "r2", severity: "critical", title: "R2 monitoring failed", message, action: "Verify the bucket and access keys immediately." }],
    };
  }
}

type FocusCharge = Record<string, unknown>;

function parseFocusCharges(payload: string): FocusCharge[] {
  const trimmed = payload.trim();
  if (!trimmed) return [];
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed.filter((item): item is FocusCharge => Boolean(item) && typeof item === "object");
    if (parsed && typeof parsed === "object") return [parsed as FocusCharge];
  } catch {
    return trimmed.split(/\r?\n/).flatMap((line) => {
      try {
        const item: unknown = JSON.parse(line);
        return item && typeof item === "object" ? [item as FocusCharge] : [];
      } catch {
        return [];
      }
    });
  }
  return [];
}

const chargeNumber = (charge: FocusCharge, ...keys: string[]) => {
  for (const key of keys) {
    const value = Number(charge[key]);
    if (Number.isFinite(value)) return value;
  }
  return 0;
};

async function collectVercel(periodStart: Date, now: Date, budgetInr: number): Promise<{ service: InfrastructureServiceReport; alerts: InfrastructureAlert[] }> {
  const token = process.env.VERCEL_ACCESS_TOKEN;
  const teamId = process.env.VERCEL_TEAM_ID;
  const usdToInr = numberFromEnv("USD_TO_INR_RATE", 88);

  if (!token || !teamId) {
    return {
      service: {
        key: "vercel",
        name: "Vercel",
        status: "unconfigured",
        configured: false,
        summary: "Vercel billing API is not connected.",
        recommendation: "Add a team access token to track real charges and receive budget alerts.",
        metrics: [{ label: "Monthly budget", value: budgetInr, unit: "inr" }],
        projectedMonthlyCostInr: 0,
        details: [
          { label: "Required", value: "VERCEL_ACCESS_TOKEN and VERCEL_TEAM_ID" },
          { label: "Availability", value: "Billing API requires a Pro or Enterprise team" },
        ],
      },
      alerts: [{
        service: "vercel",
        severity: "warning",
        title: "Vercel cost monitoring is not connected",
        message: "The admin cannot see Vercel usage or charges yet.",
        action: "Configure VERCEL_ACCESS_TOKEN and VERCEL_TEAM_ID in production.",
      }],
    };
  }

  try {
    const query = new URLSearchParams({
      teamId,
      from: periodStart.toISOString(),
      to: now.toISOString(),
    });
    const response = await fetch(`https://api.vercel.com/v1/billing/charges?${query}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/x-ndjson, application/json" },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Vercel billing API returned HTTP ${response.status}`);

    const charges = parseFocusCharges(await response.text());
    let billedUsd = 0;
    let effectiveUsd = 0;
    const services = new Map<string, number>();
    for (const charge of charges) {
      const billed = chargeNumber(charge, "BilledCost", "billedCost");
      const effective = chargeNumber(charge, "EffectiveCost", "effectiveCost");
      billedUsd += billed;
      effectiveUsd += effective;
      const name = String(charge.ServiceName || charge.serviceName || charge.SkuId || "Other");
      services.set(name, (services.get(name) || 0) + billed);
    }

    const billedInr = billedUsd * usdToInr;
    const budgetPercent = percentage(billedInr, budgetInr);
    const alert = thresholdAlert("vercel", "Vercel monthly budget", budgetPercent, "Review Vercel Usage and Spend Management before additional charges accrue.");
    const details = [...services.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, cost]) => ({ label: name, value: `US$${rounded(cost).toFixed(2)}` }));

    return {
      service: {
        key: "vercel",
        name: "Vercel",
        status: thresholdStatus(budgetPercent),
        configured: true,
        summary: `₹${rounded(billedInr).toLocaleString("en-IN")} billed against a ₹${budgetInr.toLocaleString("en-IN")} monthly alert budget.`,
        recommendation: budgetPercent >= 85 ? "Review or increase the Vercel budget now." : "Current billed usage is within the configured budget.",
        metrics: [
          { label: "Billed cost", value: billedInr, limit: budgetInr, percent: budgetPercent, unit: "inr" },
          { label: "Billed cost (USD)", value: billedUsd, unit: "usd" },
          { label: "Effective cost (USD)", value: effectiveUsd, unit: "usd" },
          { label: "Charge records", value: charges.length, unit: "count" },
        ],
        projectedMonthlyCostInr: rounded(billedInr),
        details: details.length ? details : [{ label: "Charges", value: "No charges returned for this period" }],
      },
      alerts: alert ? [alert] : [],
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Vercel billing check failed";
    return {
      service: {
        key: "vercel",
        name: "Vercel",
        status: "error",
        configured: true,
        summary: "Unable to read Vercel billing usage.",
        recommendation: "Verify the token, team ID, plan and Billing read permission.",
        metrics: [{ label: "Monthly budget", value: budgetInr, unit: "inr" }],
        projectedMonthlyCostInr: 0,
        details: [{ label: "Error", value: message }],
      },
      alerts: [{ service: "vercel", severity: "warning", title: "Vercel billing check failed", message, action: "Verify Vercel API configuration and team plan." }],
    };
  }
}

export async function collectInfrastructureReport(): Promise<InfrastructureReport> {
  const now = new Date();
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const budgetInr = numberFromEnv("INFRA_MONTHLY_BUDGET_INR", 500);
  const usdToInrRate = numberFromEnv("USD_TO_INR_RATE", 88);

  const [mongodb, r2, vercel] = await Promise.all([
    collectMongoDb(),
    collectR2(now, periodStart),
    collectVercel(periodStart, now, budgetInr),
  ]);
  const projectedMonthlyCostInr = rounded(
    mongodb.service.projectedMonthlyCostInr
    + r2.service.projectedMonthlyCostInr
    + vercel.service.projectedMonthlyCostInr,
  );
  const budgetAlert = thresholdAlert(
    "system",
    "Total tracked infrastructure budget",
    percentage(projectedMonthlyCostInr, budgetInr),
    "Review provider usage and approve additional monthly budget before service limits are reached.",
  );
  const severityOrder: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };
  const alerts = [
    ...mongodb.alerts,
    ...r2.alerts,
    ...vercel.alerts,
    ...(budgetAlert ? [budgetAlert] : []),
  ].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return {
    checkedAt: now.toISOString(),
    billingPeriodStart: periodStart.toISOString(),
    budgetInr,
    usdToInrRate,
    services: {
      mongodb: mongodb.service,
      r2: r2.service,
      vercel: vercel.service,
    },
    alerts,
    projectedMonthlyCostInr,
  };
}

export async function collectAndStoreInfrastructureReport(source: "manual" | "cron") {
  const report = await collectInfrastructureReport();
  await connectToDatabase();
  await InfrastructureSnapshot.create({
    checkedAt: new Date(report.checkedAt),
    source,
    report,
    alerts: report.alerts,
  });
  return report;
}
