import api from "../../api_config";

export async function scrapeAllGoldPrices() {
  try {
    const response = await api.post("/competitor-analysis/scrape/gold-prices");
    return response.data;
  } catch (error) {
    console.error("Error scraping gold prices:", error);
    return {
      success: false,
      prices: [],
      message: error.response?.data?.detail || "Unknown error",
    };
  }
}

