import connectToDatabase from '@/lib/mongoose';
import PlatformSettings from '@/models/PlatformSettings';
import { updatePlatformSettings } from './actions';

const defaultSettings = {
  platformName: 'LuxeStore SaaS',
  supportEmail: 'support@luxestore.com',
  supportPhone: '+91 98765 43210',
  defaultMaxProducts: 50,
  defaultMaxLinkOpens: 500,
  allowPublicRegistration: true,
  allowAutoApproval: true,
};

export default async function AdminSettingsPage() {
  await connectToDatabase();
  const settings = await PlatformSettings.findOne({ key: 'default' }).lean();
  const values = settings ? { ...defaultSettings, ...settings } : defaultSettings;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Platform Settings</h1>
        <p className="text-gray-500 mt-2">Configure the platform defaults for registration, customer support, and tenant limits.</p>
      </div>

      <form action={updatePlatformSettings} className="space-y-6 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Platform Name</label>
            <input name="platformName" defaultValue={values.platformName} className="w-full border rounded-md px-3 py-2" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Support Email</label>
            <input name="supportEmail" type="email" defaultValue={values.supportEmail} className="w-full border rounded-md px-3 py-2" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Support Phone</label>
            <input name="supportPhone" defaultValue={values.supportPhone} className="w-full border rounded-md px-3 py-2" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Default Max Products</label>
            <input name="defaultMaxProducts" type="number" min={1} defaultValue={values.defaultMaxProducts} className="w-full border rounded-md px-3 py-2" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Default Link Opens</label>
            <input name="defaultMaxLinkOpens" type="number" min={1} defaultValue={values.defaultMaxLinkOpens} className="w-full border rounded-md px-3 py-2" />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 pt-2">
          <label className="flex items-center gap-3 rounded-lg border p-3 text-sm text-gray-700">
            <input name="allowPublicRegistration" type="checkbox" defaultChecked={Boolean(values.allowPublicRegistration)} className="h-4 w-4" />
            Allow public storefront registration
          </label>

          <label className="flex items-center gap-3 rounded-lg border p-3 text-sm text-gray-700">
            <input name="allowAutoApproval" type="checkbox" defaultChecked={Boolean(values.allowAutoApproval)} className="h-4 w-4" />
            Auto-approve new shops
          </label>
        </div>

        <div className="flex justify-end">
          <button type="submit" className="bg-gray-900 hover:bg-black text-white px-5 py-2.5 rounded-md font-medium">Save Platform Settings</button>
        </div>
      </form>
    </div>
  );
}
