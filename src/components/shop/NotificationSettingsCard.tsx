"use client";

import { useMemo, useState } from "react";
import { BellRing, ChevronDown, Users } from "lucide-react";
import { updateNotificationSettings } from "@/app/dashboard/settings/notification-actions";
import {
  customerNotificationTriggers,
  renderNotificationText,
  templatesForTrigger,
  triggerLabels,
  type CustomerNotificationTrigger,
} from "@/lib/notification-templates";
import { OwnerPushButton } from "@/components/shop/OwnerPushButton";
import { ActionSubmitButton } from "@/components/ui/action-submit-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type InitialTriggerSetting = {
  trigger: CustomerNotificationTrigger;
  enabled: boolean;
  templateId: string;
  customTitle: string;
  customBody: string;
};

export function NotificationSettingsCard({
  shopName,
  subscriberCount,
  configured,
  initialEnabled,
  initialTriggers,
  publicVapidKey,
}: {
  shopName: string;
  subscriberCount: number;
  configured: boolean;
  initialEnabled: boolean;
  initialTriggers: InitialTriggerSetting[];
  publicVapidKey?: string;
}) {
  const initialMap = useMemo(() => new Map(initialTriggers.map((item) => [item.trigger, item])), [initialTriggers]);
  const [selections, setSelections] = useState<Record<string, string>>(() => Object.fromEntries(
    customerNotificationTriggers.map((trigger) => [
      trigger,
      initialMap.get(trigger)?.templateId || templatesForTrigger(trigger)[0]?.id || "",
    ]),
  ));
  const [customTitles, setCustomTitles] = useState<Record<string, string>>(() => Object.fromEntries(
    customerNotificationTriggers.map((trigger) => [trigger, initialMap.get(trigger)?.customTitle || ""]),
  ));
  const [customBodies, setCustomBodies] = useState<Record<string, string>>(() => Object.fromEntries(
    customerNotificationTriggers.map((trigger) => [trigger, initialMap.get(trigger)?.customBody || ""]),
  ));

  const preview = (trigger: CustomerNotificationTrigger) => {
    const template = templatesForTrigger(trigger).find((item) => item.id === selections[trigger])
      || templatesForTrigger(trigger)[0];
    return {
      title: renderNotificationText(customTitles[trigger] || template.title, { shopName, productName: "Diamond Necklace" }),
      body: renderNotificationText(customBodies[trigger] || template.body, { shopName, productName: "Diamond Necklace" }),
    };
  };

  return (
    <Card className="border-violet-200 shadow-sm">
      <CardHeader className="bg-gradient-to-r from-violet-50 to-amber-50">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><BellRing className="h-5 w-5 text-violet-600" /> Customer Notifications</CardTitle>
            <CardDescription className="mt-1">Choose automatic, shop-specific alerts. Customers receive them only after opting in.</CardDescription>
          </div>
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-violet-700 ring-1 ring-violet-200">
            <Users className="h-3.5 w-3.5" /> {subscriberCount} subscriber{subscriberCount === 1 ? "" : "s"}
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {!configured && (
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Add VAPID keys in Vercel to activate customer push delivery. Your templates can be configured now.
          </div>
        )}
        <div className="mb-5 rounded-xl border border-violet-200 bg-violet-50/60 p-4">
          <p className="text-sm font-bold text-gray-900">Owner alerts: new enquiries</p>
          <p className="mb-3 mt-1 text-xs text-gray-600">Get a push notification on this device whenever a customer sends an enquiry. Enable it on each phone or computer you use.</p>
          {configured && publicVapidKey
            ? <OwnerPushButton publicVapidKey={publicVapidKey} />
            : <p className="text-sm text-amber-800">Push is not configured on the server yet (VAPID keys missing), so enquiry alerts are unavailable. Enquiries still appear in your dashboard.</p>}
        </div>
        <form action={updateNotificationSettings} className="space-y-5">
          <label className="flex min-h-12 items-center justify-between gap-4 rounded-xl border bg-gray-50 px-4 py-3">
            <span>
              <span className="block text-sm font-bold text-gray-900">Enable automatic customer notifications</span>
              <span className="block text-xs text-gray-500">Turn this off to pause every automatic alert for this shop.</span>
            </span>
            <input name="notificationsEnabled" type="checkbox" defaultChecked={initialEnabled} className="h-5 w-5 accent-violet-600" />
          </label>

          <div className="space-y-3">
            {customerNotificationTriggers.map((trigger) => {
              const templates = templatesForTrigger(trigger);
              const currentPreview = preview(trigger);
              return (
                <details key={trigger} className="group overflow-hidden rounded-xl border border-gray-200 bg-white">
                  <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-semibold text-gray-900">
                    <span>{triggerLabels[trigger]}</span>
                    <ChevronDown className="h-4 w-4 text-gray-400 transition group-open:rotate-180" />
                  </summary>
                  <div className="space-y-4 border-t bg-gray-50/60 p-4">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                      <input name={`${trigger}:enabled`} type="checkbox" defaultChecked={initialMap.get(trigger)?.enabled ?? true} className="h-4 w-4 accent-violet-600" />
                      Send this notification automatically
                    </label>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">Template</label>
                      <select
                        name={`${trigger}:templateId`}
                        value={selections[trigger]}
                        onChange={(event) => setSelections((current) => ({ ...current, [trigger]: event.target.value }))}
                        className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm"
                      >
                        {templates.map((template) => <option key={template.id} value={template.id}>{template.label}</option>)}
                      </select>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">Custom title (optional)</label>
                        <input
                          name={`${trigger}:customTitle`}
                          value={customTitles[trigger]}
                          onChange={(event) => setCustomTitles((current) => ({ ...current, [trigger]: event.target.value }))}
                          maxLength={100}
                          placeholder="Use {shopName} for the shop name"
                          className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">Custom message (optional)</label>
                        <textarea
                          name={`${trigger}:customBody`}
                          value={customBodies[trigger]}
                          onChange={(event) => setCustomBodies((current) => ({ ...current, [trigger]: event.target.value }))}
                          maxLength={240}
                          rows={2}
                          placeholder="Use {productName} and {shopName}"
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                    <div className="rounded-xl border border-violet-100 bg-white p-3 shadow-sm">
                      <p className="text-xs font-bold uppercase tracking-wide text-violet-600">Customer preview</p>
                      <p className="mt-2 text-sm font-bold text-gray-950">{currentPreview.title}</p>
                      <p className="mt-1 text-sm text-gray-600">{currentPreview.body}</p>
                    </div>
                  </div>
                </details>
              );
            })}
          </div>

          <div className="flex justify-end">
            <ActionSubmitButton pendingLabel="Saving notifications…">Save Notification Settings</ActionSubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

