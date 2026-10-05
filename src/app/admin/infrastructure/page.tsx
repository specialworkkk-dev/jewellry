import { AlertTriangle, CheckCircle2, CircleDollarSign, Cloud, Database, RefreshCw, Server, XCircle } from "lucide-react";
import connectToDatabase from "@/lib/mongoose";
import type { InfrastructureMetric, InfrastructureReport, InfrastructureServiceReport } from "@/lib/infrastructure-monitor";
import InfrastructureSnapshot from "@/models/InfrastructureSnapshot";
import { refreshInfrastructureReport } from "./actions";

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

function serviceIcon(key: InfrastructureServiceReport["key"]) {
  if (key === "mongodb") return <Database className="h-5 w-5" />;
  if (key === "r2") return <Cloud className="h-5 w-5" />;
  return <Server className="h-5 w-5" />;
}

function ServiceCard({ service }: { service: InfrastructureServiceReport }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-gray-100 p-2 text-gray-700">{serviceIcon(service.key)}</span>
          <div>
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
          <p className="mt-2 text-gray-500">MongoDB, Cloudflare R2 and Vercel allowance, usage and cost alerts.</p>
        </div>
        <form action={refreshInfrastructureReport}>
          <button type="submit" className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-black">
            <RefreshCw className="h-4 w-4" /> Run live check
          </button>
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

          <div className="grid gap-5 xl:grid-cols-3">
            {Object.values(report.services).map((service) => <ServiceCard key={service.key} service={service} />)}
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
