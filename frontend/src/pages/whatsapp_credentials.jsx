import { useState } from "react";
import { useNavigate } from "react-router-dom"
import api from "../../api_config"; // your axios instance
import { WhatsAppCredentialsForm } from "@/components/ui/whatsappCredentialsForm";

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
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/20">
      <WhatsAppCredentialsForm
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </main>
  );
}

