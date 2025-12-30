import api from "../../api_config";

export async function scrapeAllBrandWebsites() {
  try {
    const response = await api.post("/competitor-analysis/scrape/brand-websites");
    return response.data;
  } catch (error) {
    console.error("Error scraping brand websites:", error);
    return {
      success: false,
      totalPrices: 0,
      totalOffers: 0,
      message: error.response?.data?.detail || "Unknown error",
    };
  }
}

