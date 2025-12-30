import api from "../../api_config";

export async function scrapeTikTokOffers(searchQuery, businessConfig) {
  try {
    const response = await api.post("/competitor-analysis/scrape/tiktok", {
      search_query: searchQuery,
      business_config: businessConfig,
    });
    return response.data;
  } catch (error) {
    console.error("Error scraping TikTok offers:", error);
    return {
      success: false,
      offers: [],
      message: error.response?.data?.detail || "Unknown error",
    };
  }
}

export async function scrapeTikTokAccountById(accountId) {
  try {
    const response = await api.post(`/competitor-analysis/scrape-tiktok/${accountId}`);
    return response.data;
  } catch (error) {
    console.error("Error scraping TikTok account:", error);
    return {
      success: false,
      totalOffers: 0,
      message: error.response?.data?.detail || "Unknown error",
    };
  }
}

export async function scrapeAllTikTokAccounts() {
  try {
    const response = await api.post("/competitor-analysis/scrape-tiktok/all");
    return response.data;
  } catch (error) {
    console.error("Error scraping all TikTok accounts:", error);
    return {
      success: false,
      totalOffers: 0,
      message: error.response?.data?.detail || "Unknown error",
    };
  }
}

