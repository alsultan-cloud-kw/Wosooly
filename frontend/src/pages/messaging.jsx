import React, { useState } from "react";
import CustomerList from "../components/customers/woocommerce/customersList";
import TemplatesList from "../components/template_lists";
import api from "../../api_config"

function Messaging() {
  const [selectedTemplates, setSelectedTemplates] = useState([]);
  const [selectedCustomers, setSelectedCustomers] = useState([]);

  const sendMessage = async () => {
    if (selectedCustomers.length === 0) {
      alert("Please select at least one customer first!");
      return;
    }
    if (selectedTemplates.length === 0) {
      alert("Please select at least one template!");
      return;
    }

    try {
      const payload = {
        customers: selectedCustomers.map(Number),
        templates: selectedTemplates.map((t) => t.template_name)
      };

      console.log("payload", payload);
      console.log("Hitting URL:", '/send-message');

      const res = await api.post('/send-message', payload);

      alert("Message sent successfully!");
      console.log(res.data);
    } catch (err) {
      console.error("Failed to send message:", err);
      alert("Failed to send message. Check console for details.");
    }
  };

  const syncTemplates = async () => {
  try {
    const res = await api.post('/sync-templates');
    alert(res.data.message || "Templates synced successfully!");

    // Optionally, you can refresh the templates list here
    // For example, if TemplatesList supports a refresh prop:
    // fetchTemplates();
  } catch (err) {
    console.error("Failed to sync templates:", err);
    alert("Failed to sync templates. Check console for details.");
  }
};

  return (
    <div className="min-h-screen p-4">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Messaging</h1>

      <div className="grid grid-cols-3 gap-4">
        {/* Column 1: Customer List */}
        <div className="border-r border-gray-300 pr-4">
          <CustomerList onSelectCustomers={setSelectedCustomers} />
        </div>

        {/* Column 2: Templates List */}
        <div className="border-r border-gray-300 pr-4">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Templates</h2>
          <button
            onClick={syncTemplates}
            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
          >
            Sync Templates
          </button>
          <TemplatesList
            selectedTemplates={selectedTemplates}
            onSelect={setSelectedTemplates}
          />
        </div>
        
        {/* Column 3: Selected Templates */}
        <div className="p-4">
          {selectedTemplates.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-400">
              Select templates to view details
            </div>
          ) : (
            <div className="space-y-4">
              {selectedTemplates.map((t) => (
                <div
                  key={t.template_name}
                  className="relative p-4 border rounded-lg bg-gray-50 shadow"
                >
                  {/* ❌ Remove button in top-right corner */}
                  <button
                    onClick={() =>
                      setSelectedTemplates((prev) =>
                        prev.filter((tpl) => tpl.template_name !== t.template_name)
                      )
                    }
                    className="absolute top-2 right-2 text-gray-400 hover:text-red-600"
                  >
                    ✕
                  </button>

                  <h3 className="font-bold text-gray-800 mb-2">{t.template_name}</h3>
                  <p className="text-sm text-gray-500 mb-2">
                    {t.category} • {t.language} • {t.status}
                  </p>
                  <p className="text-sm text-gray-700 whitespace-pre-line">{t.body}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    Last updated: {new Date(t.updated_at).toLocaleString()}
                  </p>
                </div>
              ))}

              <button
                onClick={sendMessage}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Send Message
              </button>
            </div>

          )}
        </div>
      </div>
    </div>
  );
}

export default Messaging;