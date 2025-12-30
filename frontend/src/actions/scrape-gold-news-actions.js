import api from "../../api_config";

export async function scrapeGoldNews() {
  try {
    const response = await api.post("/competitor-analysis/scrape/gold-news");
    return response.data;
  } catch (error) {
    console.error("Error scraping gold news:", error);
    return {
      success: false,
      news: [],
      message: error.response?.data?.detail || "Unknown error",
    };
  }
}

export async function scrapeNewsFromSources() {
  try {
    const response = await api.post("/competitor-analysis/scrape/news-sources");
    return response.data;
  } catch (error) {
    console.error("Error scraping news from sources:", error);
    return {
      success: false,
      message: error.response?.data?.detail || "Unknown error",
    };
  }
}

