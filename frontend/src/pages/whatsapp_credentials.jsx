import { useState } from "react";
import { useNavigate } from "react-router-dom"
import api from "../../api_config"; // your axios instance
import { WhatsAppCredentialsForm } from "@/components/ui/whatsappCredentialsForm";
import { MessageSquare } from "lucide-react";

export default function Whatsapp() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate()

  // 🔥 API call moved here
  const saveWhatsAppCredentials = async (credentials) => {
    const response = await api.post("/whatsapp/save-credentials", credentials);
    return response.data;
  };

  const handleSubmit = async (credentials) => {
    try {
      setIsLoading(true);
      const result = await saveWhatsAppCredentials(credentials);
      console.log("API Result:", result);
      navigate("/messaging")
    } catch (err) {
      console.error("Failed to save credentials:", err);
      alert("Failed to save credentials. Please check your inputs and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen py-8 px-4 bg-gradient-to-br from-green-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header Section */}
      <div className="max-w-5xl mx-auto mb-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 shadow-lg mb-4">
          <MessageSquare className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-2">
          Connect WhatsApp Business
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Set up your WhatsApp Business API credentials to start sending messages and managing templates
        </p>
      </div>

      {/* Form Section */}
      <div className="max-w-5xl mx-auto">
        <WhatsAppCredentialsForm
          onSubmit={handleSubmit}
          isLoading={isLoading}
        />
      </div>
    </main>
  );
}

