import api from "../../api_config";

export async function getOfferSuggestions() {
  try {
    const response = await api.get("/competitor-analysis/offer-suggestions");
    return response.data;
  } catch (error) {
    console.error("Error generating offer suggestions:", error);
    return {
      success: false,
      suggestions: [],
      marketAnalysis: "",
      error: error.response?.data?.detail || "Unknown error",
    };
  }
}

