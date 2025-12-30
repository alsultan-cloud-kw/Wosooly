import api from "../../api_config";

/**
 * Scrape Snapchat by username (returns stories and highlights separately)
 * Equivalent to scrapeSnapchatByUsername in TypeScript
 */
export async function scrapeSnapchatByUsername(username, brandName) {
  try {
    const response = await api.post("/competitor-analysis/scrape-snapchat/by-username", {
      username,
      brand_name: brandName,
    });
    return response.data;
  } catch (error) {
    console.error("Error scraping Snapchat by username:", error);
    return {
      success: false,
      stories: [],
      highlights: [],
      message: error.response?.data?.detail || "Unknown error",
    };
  }
}

/**
 * Scrape Snapchat gold offers by search query
 * Equivalent to scrapeSnapchatGoldOffers in TypeScript
 */
export async function scrapeSnapchatGoldOffers(searchQuery = "ذهب كويت") {
  try {
    const response = await api.post("/competitor-analysis/scrape-snapchat/gold-offers", {
      search_query: searchQuery,
    });
    return response.data;
  } catch (error) {
    console.error("Error scraping Snapchat gold offers:", error);
    return {
      success: false,
      offers: [],
      message: error.response?.data?.detail || "Unknown error",
    };
  }
}

/**
 * Scrape all Snapchat gold-related content from known Kuwait accounts
 * Equivalent to scrapeAllSnapchatGoldContent in TypeScript
 */
export async function scrapeAllSnapchatGoldContent() {
  try {
    const response = await api.post("/competitor-analysis/scrape-snapchat/all");
    return response.data;
  } catch (error) {
    console.error("Error scraping all Snapchat content:", error);
    return {
      success: false,
      totalStories: 0,
      totalHighlights: 0,
      message: error.response?.data?.detail || "Unknown error",
    };
  }
}

/**
 * Scrape a specific Snapchat account by account ID
 */
export async function scrapeSnapchatAccountById(accountId) {
  try {
    const response = await api.post(`/competitor-analysis/scrape-snapchat/${accountId}`);
    return response.data;
  } catch (error) {
    console.error("Error scraping Snapchat account by ID:", error);
    return {
      success: false,
      totalStories: 0,
      totalHighlights: 0,
      message: error.response?.data?.detail || "Unknown error",
    };
  }
}

