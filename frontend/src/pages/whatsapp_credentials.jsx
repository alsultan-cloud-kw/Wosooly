import { useState } from "react";
import { useNavigate } from "react-router-dom"
import api from "../../api_config"; // your axios instance
import { WhatsAppCredentialsForm } from "@/components/ui/whatsappCredentialsForm";
import { MessageSquare } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function Whatsapp() {
  const { t } = useTranslation("whatsapp");
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
      alert(t("form.saveFailed"));
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
          {t("title")}
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {t("subtitle")}
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

