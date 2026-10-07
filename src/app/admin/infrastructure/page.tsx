import { AlertTriangle, CheckCircle2, CircleDollarSign, RefreshCw, Server, XCircle } from "lucide-react";
import connectToDatabase from "@/lib/mongoose";
import type { InfrastructureMetric, InfrastructureReport, InfrastructureServiceReport } from "@/lib/infrastructure-monitor";
import InfrastructureSnapshot from "@/models/InfrastructureSnapshot";
import { requirePlatformAdmin } from "@/lib/admin-auth";
import { refreshInfrastructureReport } from "./actions";
import { ActionSubmitButton } from "@/components/ui/action-submit-button";

export const dynamic = "force-dynamic";

const statusStyles = {
  healthy: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  critical: "bg-red-50 text-red-700 border-red-200",
  unconfigured: "bg-slate-50 text-slate-700 border-slate-200",
  error: "bg-red-50 text-red-700 border-red-200",
};

const severityStyles = {
  info: "border-blue-200 bg-blue-50 text-blue-800",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  critical: "border-red-200 bg-red-50 text-red-900",
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 }).format(value);
}

function formatBytes(value: number) {
  if (value < 1_000) return `${formatNumber(value)} B`;
  if (value < 1_000_000) return `${formatNumber(value / 1_000)} KB`;
  if (value < 1_000_000_000) return `${formatNumber(value / 1_000_000)} MB`;
  return `${formatNumber(value / 1_000_000_000)} GB`;
}

function formatMetric(metric: InfrastructureMetric) {
  if (metric.unit === "bytes") return formatBytes(metric.value);
  if (metric.unit === "inr") return `₹${formatNumber(metric.value)}`;
  if (metric.unit === "usd") return `US$${formatNumber(metric.value)}`;
  if (metric.unit === "percent") return `${formatNumber(metric.value)}%`;
  return formatNumber(metric.value);
}

function ServiceLogo({ serviceKey }: { serviceKey: InfrastructureServiceReport["key"] }) {
  if (serviceKey === "mongodb") {
    return (
      <svg role="img" aria-label="MongoDB logo" viewBox="0 0 24 24" className="h-7 w-7 fill-[#47A248]">
        <path d="M17.193 9.555c-1.264-5.58-4.252-7.414-4.573-8.115-.28-.394-.53-.954-.735-1.44-.036.495-.055.685-.523 1.184-.723.566-4.438 3.682-4.74 10.02-.282 5.912 4.27 9.435 4.888 9.884l.07.05c.11.95.22 1.904.33 2.862h.481c.114-1.032.284-2.056.51-3.07.417-.296.604-.463.85-.693a11.342 11.342 0 0 0 3.639-8.464c.01-.814-.103-1.662-.197-2.218Zm-5.336 8.195s0-8.291.275-8.29c.213 0 .49 10.695.49 10.695-.381-.045-.765-1.76-.765-2.405Z" />
      </svg>
    );
  }

  if (serviceKey === "r2") {
    return (
      <svg role="img" aria-label="Cloudflare logo" viewBox="0 0 24 24" className="h-8 w-8 fill-[#F38020]">
        <path d="M16.509 16.845c.147-.507.09-.971-.156-1.316-.224-.316-.604-.499-1.061-.52l-8.659-.113a.156.156 0 0 1-.133-.071.191.191 0 0 1-.021-.155.224.224 0 0 1 .203-.156l8.736-.113c1.035-.049 2.16-.887 2.554-1.913l.499-1.302a.299.299 0 0 0 .014-.168c-.563-2.546-2.835-4.445-5.55-4.445-2.504 0-4.628 1.618-5.388 3.862a2.55 2.55 0 0 0-1.794-.499 2.57 2.57 0 0 0-2.286 2.286c-.028.31-.007.613.064.894C1.568 13.171 0 14.775 0 16.752c0 .175.014.352.035.527a.171.171 0 0 0 .169.148h15.981a.219.219 0 0 0 .204-.156l.12-.426Zm2.757-5.564c-.077 0-.161 0-.239.011a.166.166 0 0 0-.127.098l-.338 1.174c-.147.507-.092.971.154 1.317.226.316.606.498 1.063.519l1.844.114c.055 0 .105.026.133.07a.184.184 0 0 1 .021.156.225.225 0 0 1-.204.155l-1.921.112c-1.041.049-2.158.887-2.553 1.914l-.14.358c-.029.071.021.142.098.142h6.598a.18.18 0 0 0 .169-.126c.112-.408.176-.837.176-1.28 0-2.603-2.125-4.727-4.734-4.727Z" />
      </svg>
    );
  }

  if (serviceKey === "vercel") {
    return (
      <svg role="img" aria-label="Vercel logo" viewBox="0 0 24 24" className="h-7 w-7 fill-black">
        <path d="m12 1.608 12 20.784H0Z" />
      </svg>
    );
  }

  return (
    <svg role="img" aria-label="Ably logo" viewBox="0 0 78 64" className="h-7 w-8">
      <defs>
        <linearGradient id="ably-logo-gradient" x1="10.947" y1="74.844" x2="64.921" y2="14.901" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF5416" />
          <stop offset="1" stopColor="#FF0000" />
        </linearGradient>
      </defs>
      <path d="M38.572 0 6.296 59.074 0 54.659 29.864 0h8.708Zm.449 0 32.276 59.074 6.296-4.415L47.729 0h-8.708Z" fill="url(#ably-logo-gradient)" />
      <path d="M70.848 59.421 38.797 34.32 6.745 59.421 13.287 64l25.51-19.971L64.307 64l6.541-4.579Z" fill="url(#ably-logo-gradient)" />
    </svg>
  );
}

function positiveNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function ablyServiceReport(): InfrastructureServiceReport {
  const configured = Boolean(process.env.ABLY_API_KEY?.trim());
  const connectionLimit = positiveNumber(process.env.ABLY_CONNECTION_LIMIT, 200);
  const monthlyMessageLimit = positiveNumber(process.env.ABLY_MONTHLY_MESSAGE_LIMIT, 6_000_000);

  return {
    key: "ably",
    name: "Ably Realtime",
    status: configured ? "healthy" : "unconfigured",
    configured,
    summary: configured
      ? "Realtime updates are connected for owners and customers."
      : "Realtime updates are not configured.",
    recommendation: configured
      ? "Review live connection and message usage in the Ably dashboard as traffic grows."
      : "Add ABLY_API_KEY to enable realtime storefront updates.",
    metrics: configured ? [
      { label: "Configured connection limit", value: connectionLimit, unit: "count" },
      { label: "Configured monthly messages", value: monthlyMessageLimit, unit: "count" },
    ] : [],
    projectedMonthlyCostInr: 0,
    details: [
      { label: "Provider", value: "Ably" },
      { label: "Purpose", value: "Realtime owner and storefront updates" },
      { label: "API authentication", value: configured ? "Connected" : "Needs configuration" },
    ],
  };
}

function ServiceCard({ service }: { service: InfrastructureServiceReport }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gray-100 bg-white shadow-sm">
            <ServiceLogo serviceKey={service.key} />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">Third-party service</p>
            <h2 className="font-semibold text-gray-900">{service.name}</h2>
            <p className="mt-1 text-sm text-gray-500">{service.summary}</p>
          </div>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${statusStyles[service.status]}`}>
          {service.status}
        </span>
      </div>

      <div className="mt-5 space-y-4">
        {service.metrics.map((metric) => (
          <div key={metric.label}>
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-gray-600">{metric.label}</span>
              <span className="font-medium text-gray-900">
                {formatMetric(metric)}{metric.limit ? ` / ${formatMetric({ ...metric, value: metric.limit })}` : ""}
              </span>
            </div>
            {typeof metric.percent === "number" && (
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full ${metric.percent >= 85 ? "bg-red-500" : metric.percent >= 70 ? "bg-amber-500" : "bg-emerald-500"}`}
                  style={{ width: `${Math.min(100, Math.max(0, metric.percent))}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
        <span className="font-medium">Recommendation:</span> {service.recommendation}
      </div>
      {service.details.length > 0 && (
        <dl className="mt-4 grid gap-2 text-sm">
          {service.details.map((detail) => (
            <div key={`${detail.label}-${detail.value}`} className="flex justify-between gap-4">
              <dt className="text-gray-500">{detail.label}</dt>
              <dd className="break-all text-right font-medium text-gray-800">{detail.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

export default async function InfrastructurePage() {
  await requirePlatformAdmin();
  await connectToDatabase();
  const [latest, history] = await Promise.all([
    InfrastructureSnapshot.findOne().sort({ checkedAt: -1 }).lean(),
    InfrastructureSnapshot.find().sort({ checkedAt: -1 }).limit(10).select("checkedAt source alerts").lean(),
  ]);
  const report = latest?.report as InfrastructureReport | undefined;
  const criticalCount = report?.alerts.filter((alert) => alert.severity === "critical").length ?? 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Infrastructure monitor</h1>
          <p className="mt-2 text-gray-500">MongoDB, Cloudflare R2, Vercel and Ably service status, allowance, usage and cost alerts.</p>
        </div>
        <form action={refreshInfrastructureReport}>
          <ActionSubmitButton pendingLabel="Checking services…" className="h-auto bg-gray-900 px-4 py-2.5 text-white hover:bg-black">
            <RefreshCw className="h-4 w-4" /> Run live check
          </ActionSubmitButton>
        </form>
      </div>

      {!report ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <Server className="mx-auto h-10 w-10 text-gray-400" />
          <h2 className="mt-3 font-semibold text-gray-900">No infrastructure check yet</h2>
          <p className="mt-1 text-sm text-gray-500">Run the first live check to create the dashboard and alerts.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-gray-500"><CircleDollarSign className="h-4 w-4" /> Tracked cost this month</div>
              <p className="mt-2 text-2xl font-bold text-gray-900">₹{formatNumber(report.projectedMonthlyCostInr)}</p>
              <p className="mt-1 text-xs text-gray-500">Budget alert level: ₹{formatNumber(report.budgetInr)}</p>
            </div>
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-gray-500"><AlertTriangle className="h-4 w-4" /> Active alerts</div>
              <p className="mt-2 text-2xl font-bold text-gray-900">{report.alerts.length}</p>
              <p className="mt-1 text-xs text-gray-500">{criticalCount} critical</p>
            </div>
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-gray-500"><CheckCircle2 className="h-4 w-4" /> Last checked</div>
              <p className="mt-2 text-base font-semibold text-gray-900">{new Date(report.checkedAt).toLocaleString("en-IN")}</p>
              <p className="mt-1 text-xs text-gray-500">Daily automatic check plus manual refresh</p>
            </div>
          </div>

          {report.alerts.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-900">Action required</h2>
              {report.alerts.map((alert, index) => (
                <div key={`${alert.service}-${alert.title}-${index}`} className={`rounded-lg border p-4 ${severityStyles[alert.severity]}`}>
                  <div className="flex gap-3">
                    {alert.severity === "critical" ? <XCircle className="mt-0.5 h-5 w-5 shrink-0" /> : <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />}
                    <div>
                      <p className="font-semibold">{alert.title}</p>
                      <p className="mt-1 text-sm">{alert.message}</p>
                      <p className="mt-2 text-sm font-medium">Next step: {alert.action}</p>
                    </div>
                  </div>
                </div>
              ))}
            </section>
          ) : (
            <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
              <CheckCircle2 className="h-5 w-5" /> All monitored services are safely within their configured allowances.
            </div>
          )}

          <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-4">
            {[...Object.values(report.services), ablyServiceReport()].map((service) => <ServiceCard key={service.key} service={service} />)}
          </div>
        </>
      )}

      {history.length > 0 && (
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900">Recent checks</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b text-gray-500"><tr><th className="pb-2 font-medium">Time</th><th className="pb-2 font-medium">Source</th><th className="pb-2 text-right font-medium">Alerts</th></tr></thead>
              <tbody className="divide-y">
                {history.map((item) => (
                  <tr key={String(item._id)}>
                    <td className="py-3 text-gray-700">{new Date(item.checkedAt).toLocaleString("en-IN")}</td>
                    <td className="py-3 capitalize text-gray-600">{item.source}</td>
                    <td className="py-3 text-right font-medium text-gray-900">{item.alerts?.length ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
