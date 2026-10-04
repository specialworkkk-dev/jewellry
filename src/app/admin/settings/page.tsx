export default function AdminSettingsPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">Platform Settings</h1>
      
      <div className="bg-white rounded-lg border shadow-sm p-8 text-center mt-8">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Master Settings Node</h3>
        <p className="text-gray-500 mb-6 max-w-md mx-auto">
          Global platform configurations, billing tiers, and API keys can be managed here. This module is currently locked in your environment.
        </p>
        <button className="px-4 py-2 bg-gray-100 text-gray-500 rounded-md font-medium cursor-not-allowed">
          System Configuration Locked
        </button>
      </div>
    </div>
  );
}
