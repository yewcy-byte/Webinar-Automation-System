import { BulkWhatsAppForm } from "@/components/BulkWhatsAppForm";

export default function WhatsAppPage() {
  return (
    <main className="mx-auto w-full max-w-4xl p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">WhatsApp Bulk Messaging</h1>
        <p className="text-gray-600">
          Send webinar invitation messages to multiple contacts at once. Upload an Excel file with phone numbers and names,&nbsp;
          and we&apos;ll handle sending personalized messages to everyone.
        </p>
      </div>

      <div className="grid gap-6 mb-8">
        {/* Instructions */}
        <div className="rounded border border-blue-300 bg-blue-50 p-4">
          <h2 className="font-semibold text-blue-900 mb-3">📋 How to prepare your Excel file:</h2>
          <ol className="text-sm text-blue-900 space-y-2 ml-4 list-decimal">
            <li>Create an Excel file (.xlsx) with contact information</li>
            <li>Include a column for phone numbers (named: phone, whatsapp, mobile, number, or contact)</li>
            <li>Include a column for names (named: name, fullname, first name, or recipient)</li>
            <li>
              Phone numbers should be in format: <code className="bg-white px-1 rounded">+60123456789</code> or <code className="bg-white px-1 rounded">0123456789</code>
            </li>
            <li>Save the file and upload it below</li>
          </ol>
        </div>

        {/* Example Excel Structure */}
        <div className="rounded border border-gray-300 bg-gray-50 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">📊 Example Excel Structure:</h3>
          <div className="overflow-x-auto">
            <table className="text-sm w-full border-collapse">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-gray-300 p-2 text-left">Name</th>
                  <th className="border border-gray-300 p-2 text-left">Phone</th>
                  <th className="border border-gray-300 p-2 text-left">Email</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 p-2">John Doe</td>
                  <td className="border border-gray-300 p-2">+60123456789</td>
                  <td className="border border-gray-300 p-2">john@example.com</td>
                </tr>
                <tr className="bg-gray-100">
                  <td className="border border-gray-300 p-2">Jane Smith</td>
                  <td className="border border-gray-300 p-2">+60187654321</td>
                  <td className="border border-gray-300 p-2">jane@example.com</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Form */}
      <BulkWhatsAppForm />

      {/* Configuration Info */}
      <div className="mt-8 rounded border border-yellow-300 bg-yellow-50 p-4">
        <h3 className="font-semibold text-yellow-900 mb-2">⚙️ Configuration Required:</h3>
        <p className="text-sm text-yellow-900 mb-3">
          To use WhatsApp bulk messaging, add these environment variables to your <code className="bg-white px-1 rounded">.env.local</code>:
        </p>
        <pre className="bg-white p-3 rounded border border-yellow-200 text-xs overflow-x-auto">
{`WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_meta_access_token
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id`}
        </pre>
        <p className="text-xs text-yellow-900 mt-3">
          Get these values from your{" "}
          <a
            href="https://developers.facebook.com/docs/whatsapp/cloud-api"
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-blue-600"
          >
            Meta WhatsApp Business API
          </a>
          {" "}dashboard.
        </p>
      </div>
    </main>
  );
}
